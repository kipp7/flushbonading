# Change: Add embedded devtools bundle (SPL templates, pin constraints, exports, imports)

## Why
PinForge needs embedded-focused tooling beyond visualization, including SPL template code, pin safety constraints, hardware exports, and offline data import templates.

## What Changes
- Add SPL-only code template generation for allocated buses and sensor placeholders (no HAL/LL output).
- Add pin constraint rules for reserved/critical functions (SWD/BOOT/OSC/etc.) with conflict surfacing.
- Add hardware export outputs (pin usage table, wiring list, and BOM summary).
- Add offline MCU/sensor data import templates (JSON/CSV) with validation.

## Impact
- Affected specs: codegen-spl, pin-constraints, hardware-export, catalog-import
- Affected code: src/lib/codegen.ts, src/lib/allocator.ts, src/data/*, UI export/import panels
