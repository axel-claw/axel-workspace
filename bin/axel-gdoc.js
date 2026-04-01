#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token.startsWith('--')) {
      args[token.slice(2)] = argv[i + 1] ?? 'true';
      i += 1;
    }
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
if (!args.title) {
  console.error('Usage: axel-gdoc --title "Title" [--share email@example.com]');
  process.exit(1);
}

const create = spawnSync('gws', ['docs', 'documents', 'create', '--json', JSON.stringify({ title: args.title })], { encoding: 'utf8' });
if (create.status !== 0) {
  process.stderr.write(create.stderr || create.stdout);
  process.exit(create.status ?? 1);
}
const created = JSON.parse(create.stdout);
const documentId = created.documentId;

if (args.share) {
  const perm = spawnSync('gws', [
    'drive', 'permissions', 'create',
    '--params', JSON.stringify({ fileId: documentId, sendNotificationEmail: true }),
    '--json', JSON.stringify({ type: 'user', role: 'writer', emailAddress: args.share })
  ], { encoding: 'utf8' });
  if (perm.status !== 0) {
    process.stderr.write(perm.stderr || perm.stdout);
    process.exit(perm.status ?? 1);
  }
}

const info = spawnSync('gws', ['drive', 'files', 'get', '--params', JSON.stringify({ fileId: documentId, fields: 'webViewLink,name' })], { encoding: 'utf8' });
if (info.status !== 0) {
  process.stderr.write(info.stderr || info.stdout);
  process.exit(info.status ?? 1);
}
process.stdout.write(info.stdout);
