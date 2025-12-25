# Change: Define PinForge Core Capabilities

## Why
The project needs a clear, shared definition of core behavior before expanding features. A concise spec helps align UI, allocation logic, and future data sources.

## What Changes
- Define core capabilities for MCU selection, sensor library, allocation, wiring visualization, and exports.
- Add requirements for layout behavior and user-driven placement.
- Add requirements for project persistence and custom sensor templates.
- Add requirements for offline-first operation and standard library code generation.

## Impact
- Affected specs: `specs/pin-planner/spec.md` (new)
- Affected code: UI (`src/App.tsx`, `src/App.css`), data (`src/data/*`), logic (`src/lib/*`), persistence layer (new), codegen (new)
