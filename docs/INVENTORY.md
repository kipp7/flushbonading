# Inventory (Shipped vs OpenSpec)

This inventory captures what is currently implemented in the repo and how it maps to OpenSpec.

## Implemented Capabilities
- Pin planning (MCU + sensor selection, allocation, wiring, exports)
- Catalog import (sensor/MCU/constraints templates + import)
- Pin constraints (default rules + enforcement)
- Hardware export (JSON)
- SPL code generation (SPL-only, includes sensor stubs)

## OpenSpec Status
- Baseline specs live in `openspec/specs/*`.
- Archived completed proposals:
  - `openspec/changes/archive/2025-12-24-add-pinforge-core`
  - `openspec/changes/archive/2025-12-24-add-pinforge-embedded-devtools`
- Active milestone proposal:
  - `openspec/changes/update-pinforge-m2-foundation`
