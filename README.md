# axel-workspace

Small tools Axel builds for himself.

## Artifact tracker

Track visible outputs so Axel can answer what he shipped today without re-checking Docs, inbox threads, and posts by hand.

### Add an artifact

```bash
node bin/axel-artifacts.js add \
  --type doc \
  --title "Daily brief for Patrick - 2026-04-01" \
  --url "https://docs.google.com/..." \
  --surface google-doc \
  --sharedWith patrick@selamy.dev
```

### Show today's artifacts

```bash
node bin/axel-artifacts.js today
```

### Generate a daily brief from the ledger

```bash
node bin/axel-artifacts.js brief
```
