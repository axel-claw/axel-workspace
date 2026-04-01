#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const dataDir = path.join(root, 'data');
const ledgerPath = path.join(dataDir, 'artifacts.json');

function ensureLedger() {
  fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(ledgerPath)) {
    fs.writeFileSync(ledgerPath, '[]\n');
  }
}

function loadLedger() {
  ensureLedger();
  return JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
}

function saveLedger(items) {
  fs.writeFileSync(ledgerPath, JSON.stringify(items, null, 2) + '\n');
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token.startsWith('--')) {
      args[token.slice(2)] = argv[i + 1];
      i += 1;
    }
  }
  return args;
}

function todayUtc() {
  return new Date().toISOString().slice(0, 10);
}

function itemsForDate(date) {
  return loadLedger().filter((item) => item.date === date);
}

function addArtifact(argv) {
  const args = parseArgs(argv);
  const required = ['type', 'title'];
  for (const key of required) {
    if (!args[key]) {
      console.error(`Missing --${key}`);
      process.exit(1);
    }
  }
  const items = loadLedger();
  const entry = {
    id: `${Date.now()}`,
    createdAt: new Date().toISOString(),
    date: todayUtc(),
    type: args.type,
    title: args.title,
    url: args.url || '',
    surface: args.surface || '',
    status: args.status || 'shipped',
    sharedWith: args.sharedWith || '',
    notes: args.notes || ''
  };
  items.push(entry);
  saveLedger(items);
  console.log(`Added artifact: ${entry.title}`);
}

function printToday() {
  const items = itemsForDate(todayUtc());
  if (!items.length) {
    console.log('No artifacts logged today.');
    return;
  }
  for (const item of items) {
    const url = item.url ? `\n  ${item.url}` : '';
    const surface = item.surface ? ` [${item.surface}]` : '';
    console.log(`- ${item.type}${surface}: ${item.title}${url}`);
  }
}

function printBrief(argv) {
  const args = parseArgs(argv);
  const date = args.date || todayUtc();
  const items = itemsForDate(date);
  console.log(`Daily brief for ${date}\n`);
  if (!items.length) {
    console.log('- No logged artifacts');
    return;
  }

  const grouped = new Map();
  for (const item of items) {
    if (!grouped.has(item.type)) grouped.set(item.type, []);
    grouped.get(item.type).push(item);
  }

  console.log('Shipped');
  for (const [type, entries] of grouped.entries()) {
    console.log(`- ${type}: ${entries.length}`);
    for (const entry of entries) {
      const extra = entry.url ? ` (${entry.url})` : '';
      console.log(`  - ${entry.title}${extra}`);
    }
  }

  const pending = items.filter((item) => ['draft', 'needs-followup', 'blocked'].includes(item.status));
  console.log('\nNeeds attention');
  if (!pending.length) {
    console.log('- None logged');
  } else {
    for (const item of pending) {
      console.log(`- ${item.title} [${item.status}]`);
    }
  }
}

const [command, ...rest] = process.argv.slice(2);
if (command === 'add') {
  addArtifact(rest);
} else if (command === 'today') {
  printToday();
} else if (command === 'brief') {
  printBrief(rest);
} else {
  console.log('Usage: axel-artifacts <add|today|brief> ...');
  process.exit(command ? 1 : 0);
}
