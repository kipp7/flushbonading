# Contributing

## Local Dev

### Desktop (recommended)
```bash
npm install
npm run dev
```

### Web-only
```bash
npm run dev:web
```

## Tooling
- Lint: `npm run lint`
- Build: `npm run build`
- Offline check: `npm run check:offline`
- Allocator check: `npm run check:allocator`

## Offline-first Rule
Do not introduce runtime network calls or workflows that require online access.
