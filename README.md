# TARS Analytics — redesign prototype

Redesign of Analytics → Overview (including Topics), built with TARS design system tokens.
All numbers are sample data based on the Brightline Prod screenshots (`src/data.ts`).

## Run

```bash
npm run dev     # http://localhost:5173
```

## Where things are

- `src/index.css` — design system tokens (colors, type, spacing, shadows)
- `src/components/ui.tsx` — Card, Button, Badge, Tooltip, Sheet, Modal, Menu, Segmented…
- `src/components/charts.tsx` — Sparkline, ColumnChart, Heatmap
- `src/sections/` — one file per page section; `DesignNotes.tsx` holds the before/after change log

## Versions

- `/` — v1 (`src/App.tsx`, `src/sections/…`)
- `/v2` — v2, a separate copy in `src/v2/` (edit freely without affecting v1). Shared: `src/index.css` tokens.
