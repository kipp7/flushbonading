# Project File Format

PinForge saves and loads projects as a local JSON file download.

## File Name
- Default: `pinforge_project.json`

## Schema
- Type: `ProjectFile` in `src/types.ts`
- Fields (current):
  - `version` (number)
  - `locale` ("zh" | "en")
  - `series`, `mcuId`
  - `selectedSensors`
  - `customSensors`
  - `customMcus` (optional)
  - `boardPositions`
  - `mcuPosition`
  - `pinLocks`
  - `pinConstraints` (optional)

## Compatibility Notes
- Future schema versions should be migrated on load using a dedicated migration function.
