#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

function parseLine(line) {
  const match = line.match(/^(\d{1,2}\/\d{1,2}\/\d{2}),\s+([^\-]+)\s+-\s+([^:]+):\s+(.*)$/);
  if (!match) return null;
  return {
    date: match[1],
    time: match[2].trim(),
    sender: match[3].trim(),
    text: match[4].trim(),
  };
}

function summarize(messages) {
  const senderCounts = new Map();
  const links = [];
  const keywords = ['agent', 'agents', 'rag', 'quant', 'quantization', 'mcp', 'memory', 'openai', 'gemini', 'claude'];
  const keywordCounts = new Map();

  for (const msg of messages) {
    senderCounts.set(msg.sender, (senderCounts.get(msg.sender) || 0) + 1);
    for (const url of msg.text.match(/https?:\/\/\S+/g) || []) links.push({ sender: msg.sender, date: msg.date, url });
    const lower = msg.text.toLowerCase();
    for (const kw of keywords) {
      if (lower.includes(kw)) keywordCounts.set(kw, (keywordCounts.get(kw) || 0) + 1);
    }
  }

  return {
    totalMessages: messages.length,
    firstDate: messages[0]?.date || '',
    lastDate: messages[messages.length - 1]?.date || '',
    topSenders: [...senderCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15).map(([sender, count]) => ({ sender, count })),
    keywordHits: [...keywordCounts.entries()].sort((a, b) => b[1] - a[1]).map(([keyword, count]) => ({ keyword, count })),
    sampleLinks: links.slice(0, 50),
  };
}

const [inputPath, outputPath] = process.argv.slice(2);
if (!inputPath || !outputPath) {
  console.error('Usage: axel-whatsapp <input.txt> <output.json>');
  process.exit(1);
}

const raw = fs.readFileSync(inputPath, 'utf8').split(/\r?\n/);
const messages = raw.map(parseLine).filter(Boolean);
const summary = summarize(messages);
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(summary, null, 2) + '\n');
console.log(`Wrote ${outputPath}`);
console.log(`Parsed ${summary.totalMessages} messages from ${summary.firstDate} to ${summary.lastDate}`);
