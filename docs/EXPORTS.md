# Export Formats

PinForge exports are file downloads generated locally (offline-first).

## Pin Map
- JSON: `*_pinmap.json` from `src/lib/export.ts` (`buildPinmapJson`)
- CSV: `*_pinmap.csv` from `src/lib/export.ts` (`buildPinmapCsv`)

## Hardware
- JSON: `*_hardware.json` from `src/lib/export.ts` (`buildHardwareJson`)
  - Includes pin usage table, wiring list, BOM summary, conflicts.
- CSV:
  - `*_hardware_pin_usage.csv` from `src/lib/export.ts` (`buildHardwarePinUsageCsv`)
  - `*_hardware_wiring.csv` from `src/lib/export.ts` (`buildHardwareWiringCsv`)
  - `*_hardware_bom.csv` from `src/lib/export.ts` (`buildHardwareBomCsv`)

## Codegen
- SPL C: `*_spl.c` from `src/lib/codegen.ts` (`buildSplCode`)
  - SPL-only output (no HAL/LL), includes I2C helper stubs and a selectable speed preset.

## Export Bundle
- ZIP: `*_bundle.zip` from `src/lib/zip.ts` (`buildZipBlob`)
  - Always includes `manifest.json`, and includes selected outputs (pinmap/hardware/code).

## Naming
- Default naming uses `mcu.name.toLowerCase()` prefix.
- Timestamp metadata is embedded in JSON payloads via `generatedAt`.
