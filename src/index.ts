import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const server = new Server(
  {
    name: "axel-workspace-mcp",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

async function runShell(command: string): Promise<string> {
  const { stdout, stderr } = await execFileAsync("bash", ["-lc", command], {
    maxBuffer: 1024 * 1024,
  });
  return [stdout, stderr].filter(Boolean).join("\n").trim();
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'"'"'`)}'`;
}

async function searchLifeData(query: string): Promise<string> {
  const fileList = await runShell('ssh dev-dispatch "ls ~/.local/share/life/memories"');
  const files = fileList
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => line.endsWith(".md"));

  const needle = query.toLowerCase();
  const matches: string[] = [];

  for (const file of files) {
    const remotePath = `~/.local/share/life/memories/${file}`;
    const content = await runShell(`ssh dev-dispatch "cat ${remotePath}"`);
    const lines = content.split("\n");
    for (let i = 0; i < lines.length; i += 1) {
      if (lines[i].toLowerCase().includes(needle)) {
        matches.push(`${remotePath}:${i + 1}:${lines[i]}`);
      }
    }
  }

  return matches.join("\n").trim() || "No matches found.";
}

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "dispatch_status",
      description: "Check current Ralph/OpenClaw dispatch status via dev-dispatch.",
      inputSchema: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
    },
    {
      name: "dispatch_task",
      description: "Dispatch a development task to an org user via dev-dispatch. Never use pselamy for Axel work unless explicitly requested.",
      inputSchema: {
        type: "object",
        properties: {
          user: { type: "string", description: "Target user." },
          repo: { type: "string", description: "Repository name." },
          prompt: { type: "string", description: "Task prompt." },
          max: { type: "number", description: "Optional max iterations." }
        },
        required: ["user", "repo", "prompt"],
        additionalProperties: false,
      },
    },
    {
      name: "search_life_data",
      description: "Search shared life data on dev-dispatch under ~/.local/share/life/.",
      inputSchema: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search string for ripgrep." }
        },
        required: ["query"],
        additionalProperties: false,
      },
    },
    {
      name: "check_capabilities",
      description: "List key skills, tools, and operator capabilities available to Axel.",
      inputSchema: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === "dispatch_status") {
    const output = await runShell('ssh dev-dispatch "dotfiles-dispatch-status"');
    return { content: [{ type: "text", text: output }] };
  }

  if (name === "dispatch_task") {
    const user = String(args?.user ?? "");
    const repo = String(args?.repo ?? "");
    const prompt = String(args?.prompt ?? "");
    const max = args?.max ? Number(args.max) : undefined;

    if (!user || !repo || !prompt) {
      throw new Error("user, repo, and prompt are required");
    }

    if (user === "pselamy") {
      throw new Error("Dispatching to pselamy is blocked by default. Use only for explicitly requested personal work.");
    }

    const maxArg = Number.isFinite(max) ? ` --max ${max}` : "";
    const output = await runShell(
      `ssh dev-dispatch "dotfiles-dispatch ${user} ${repo} ${shellQuote(prompt)}${maxArg}"`
    );
    return { content: [{ type: "text", text: output }] };
  }

  if (name === "search_life_data") {
    const query = String(args?.query ?? "");
    if (!query) {
      throw new Error("query is required");
    }
    const output = await searchLifeData(query);
    return { content: [{ type: "text", text: output }] };
  }

  if (name === "check_capabilities") {
    const capabilities = [
      "Dispatch status via dev-dispatch",
      "Task dispatch to org users via dotfiles-dispatch",
      "Shared life data search on dev-dispatch",
      "Google Workspace access via axel-claw",
      "GitHub repo/git/gh operations under axel-claw",
      "Web/social tools on axel-claw (moltbook, linkedin-read, x-read)",
      "Local workspace skills including devquery, dispatch, email, web, google-calendar, issues, status, persist, and more"
    ].join("\n");
    return { content: [{ type: "text", text: capabilities }] };
  }

  throw new Error(`Unknown tool: ${name}`);
});

const transport = new StdioServerTransport();
await server.connect(transport);
