# axel-mcp

MCP server for Axel Claw — exposes dispatch, life data, and capability tools as a standard Model Context Protocol service.

## Tools

| Tool | Description |
|------|-------------|
| `dispatch_status` | Check current dispatch status across all org users |
| `dispatch_task` | Send a development task to an org user via Ralph Loop |
| `search_life_data` | Search shared life data knowledge base |
| `check_capabilities` | List available skills and tools |

## Setup

```bash
npm install
npm run build
```

## Usage with OpenClaw

Add to `openclaw.json`:

```json
{
  "mcpServers": {
    "axel": {
      "command": "node",
      "args": ["dist/index.js"],
      "cwd": "/path/to/axel-workspace"
    }
  }
}
```

## Architecture

This server runs on the OpenClaw VPS and communicates with the dev server via SSH (`dev-dispatch` alias). It codifies the existing proxy command contracts into standard MCP tools.

## Identity

This is Axel-owned infrastructure. All operations run under the `axel-claw` identity. The `dispatch_task` tool blocks routing to `pselamy` by default — Axel work belongs in Axel lanes.
