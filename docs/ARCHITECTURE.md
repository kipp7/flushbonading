# Architecture

PinForge is an offline-first desktop pin-planning tool. The UI runs as a local web app inside a Tauri shell.

## High Level
- `src/App.tsx`: current main UI composition (left library, center canvas, right assignments).
- `src/data/*`: demo catalogs (MCUs, sensors, constraints).
- `src/lib/*`: domain logic (allocator, catalog parsing, exports, code generation).
- `src/types.ts`: shared domain types used across the app.
- `src-tauri/*`: Tauri desktop shell configuration and Rust entrypoint.

## Core Flows

### Pin Planning
1. User selects MCU + sensors.
2. Allocator produces:
   - per-sensor assigned pins
   - bus assignments
   - conflicts (blocking)
3. UI renders MCU board + sensor boards and draws wires between pin pads.

### Data Tooling (Offline)
1. User downloads CSV/JSON templates.
2. User imports catalogs (local files).
3. Imported items are validated and then appended/replaced depending on the feature.

### Outputs
- Pin map exports: `*_pinmap.json` / `*_pinmap.csv`
- Hardware exports: `*_hardware.json`
- Codegen exports: `*_spl.c` (SPL-only)

## Directory Conventions
- Keep domain logic in `src/lib/` and UI-only code in `src/`.
- Keep catalogs in `src/data/` (demo) and user-added catalogs in local persistence (later milestone).
- Keep UI strings centralized and consistent across locales.

## OpenSpec Discipline
- `openspec/specs/`: current truth (built behavior).
- `openspec/changes/`: proposed deltas, implemented only after approval.
