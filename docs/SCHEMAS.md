# Data Schemas (MVP)

This document describes the current local data shapes used by PinForge.

## Catalog Envelopes
Catalog import/export uses a small schema metadata envelope:

- JSON: `{ schemaVersion: 1, kind: "...", generatedAt: "...", <itemsKey>: [...] }`
- CSV: first comment line contains metadata, e.g. `# pinforge_schemaVersion=1; kind=sensors`

Schema compatibility rule:
- Accepts `schemaVersion` = `1` (current) or missing/`0` (legacy)
- Rejects other versions (import is not applied)

## Sensor
- Source of truth: `src/types.ts` (`Sensor`)
- Import templates: Data Tools panel
- Required fields:
  - `id` (string)
  - `name` (string)
  - `interface` (I2C|SPI|UART|ADC|PWM|GPIO|ONE_WIRE)
  - `signals` (string[])
  - `description` (string)
- Optional fields:
  - `i2cAddress` (number, 7-bit)
  - `requiredBusId` (string)

## MCU
- Source of truth: `src/types.ts` (`MCU`)
- Required fields:
  - `id`, `name`, `series`, `package`
  - `pins` (array of `Pin`)
  - `buses` (i2c/spi/uart)
  - `analogPins`, `pwmPins`, `reservedPins`

## Constraints
- Source of truth: `src/types.ts` (`PinConstraint`)
- Default set: `src/data/constraints.ts`
- Fields:
  - `id`, `label`, `pins`, `level` (hard|soft), `enabled` (optional)
  - optional scoping: `series`, `mcuIds`
