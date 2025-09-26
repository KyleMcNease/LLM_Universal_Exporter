# Universal AI Exporter

Source for the browser extension now lives under `extension/`. See `extension/README.md` for full product documentation, build instructions, and feature set. This top-level repo additionally contains:

- `build/` artifacts and packaging scripts
- `scripts/` utilities for validation, security checks, and icon generation
- `website/` marketing site (Next.js)
- `03-Projects/Universal Exporter.md` (Obsidian log with current plan and run notes)

## Quick Start

```bash
npm install
npm run build          # syncs extension/ into dist/
npm run test           # lint + security checks
npm run package        # builds dist/ and produces universal-ai-exporter-v1.0.0.zip
```

Refer to the Obsidian log for active status, QA checklist, and open follow-ups.
