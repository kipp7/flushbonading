# Regression Checklist

Use this list for manual QA before releases.

## Core Flow
- Select MCU (series + part) and verify pin map renders.
- Select multiple sensors and verify:
  - allocations appear in right panel
  - conflicts show when expected
  - wiring lines connect correct pins
- Canvas UX:
  - zoom in/out/reset keeps wires aligned
  - hold Space + drag pans the canvas
  - hover a pin/sensor highlights related wires
- Drag MCU and sensors:
  - dragging requires holding left mouse button
  - MCU lock toggle prevents dragging
- Change a sensor orientation (AUTO/Top/Right/Bottom/Left), save + reload, and verify orientation persists.
- Save project and reload:
  - MCU, sensors, positions restore correctly

## Exports
- Export JSON pinmap downloads and contains current assignments.
- Export CSV pinmap downloads and rows match visible pin usage.
- Export SPL downloads and contains no HAL/LL APIs.
- Switch SPL speed preset and verify generated bus init uses new parameters.
- Export hardware JSON downloads and includes wiring list + BOM.
- Export hardware CSV downloads (pin usage / wiring / BOM).
- Export bundle downloads and contains `manifest.json` plus selected outputs.

## Data Tools
- Download templates (CSV/JSON) without network.
- Import valid sensor/MCU/constraint catalogs and see them applied.
- Import invalid catalogs and confirm error feedback.
