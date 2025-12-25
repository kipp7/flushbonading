# Change: Update PinForge M2 foundation (governance, data, UX, exports)

## Why
PinForge has a working MVP, but needs a hardened foundation for the next milestone: consistent specs as truth, versioned schemas with migrations, better diagnostics and feedback, and planning intelligence checks that keep the tool reliable as catalogs and exports grow.

## What Changes
1. Establish specs as the current truth by adding baseline capabilities under `openspec/specs/` and aligning changes with them.
2. Add an app shell foundation: settings persistence, error boundary, toast feedback, and diagnostics.
3. Strengthen data tooling: schema versioning, import preview and summary, and clear merge or replace semantics.
4. Expand constraints into an editable and overrideable system with soft warnings.
5. Add planning intelligence checks (address, bus capacity, capability mismatch) while preserving offline first operation.
6. Improve canvas usability: zoom, pan, hover focus, and sensor orientation.
7. Expand exports: CSV hardware outputs and an export bundle with consistent naming and metadata.

## Impact
Affected specs:
- `specs/pin-planner/spec.md`
- `specs/catalog-import/spec.md`
- `specs/pin-constraints/spec.md`
- `specs/hardware-export/spec.md`
- `specs/codegen-spl/spec.md`
- New: `specs/app-shell/spec.md`
- New: `specs/project-storage/spec.md`

Affected code (expected):
- UI: `src/App.tsx`, `src/App.css`
- Logic: `src/lib/allocator.ts`, `src/lib/catalog.ts`, `src/lib/export.ts`, `src/lib/codegen.ts`
- Data: `src/data/*`
- Scripts: `scripts/check_allocator.ts`, `scripts/check_offline.mjs`, plus new scripted checks

## Approval Gate
This proposal is considered approved when the Chief Architect includes it in an active Super Milestone and publishes acceptance criteria to the Execution Agent.

