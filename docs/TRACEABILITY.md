# Traceability (Features -> Modules -> OpenSpec)

This map links shipped behavior to implementation touch points and the OpenSpec capability specs.

## Pin Planner (`openspec/specs/pin-planner/spec.md`)
- UI: `src/App.tsx`, `src/App.css`
- Allocator: `src/lib/allocator.ts`
- Demo MCU catalog: `src/data/mcus.ts`
- Demo sensor catalog: `src/data/sensors.ts`

## Catalog Import (`openspec/specs/catalog-import/spec.md`)
- Parsers + templates: `src/lib/catalog.ts`
- UI (Data Tools): `src/App.tsx`

## Pin Constraints (`openspec/specs/pin-constraints/spec.md`)
- Default constraints: `src/data/constraints.ts`
- Enforcement: `src/lib/allocator.ts`
- UI surfacing: `src/App.tsx`

## Hardware Export (`openspec/specs/hardware-export/spec.md`)
- Export builder: `src/lib/export.ts`
- UI export action: `src/App.tsx`

## SPL Codegen (`openspec/specs/codegen-spl/spec.md`)
- Code generator: `src/lib/codegen.ts`
- UI export action: `src/App.tsx`
