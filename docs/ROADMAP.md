# PinForge Roadmap

## Vision
PinForge is an offline-first desktop planner for embedded pin allocation, sensor fitting, and hardware outputs for STM32-class MCUs.

## Principles
- Offline first, local files only
- SPL-only code output (no HAL/LL)
- Clear, hardware-like visuals and wiring

## Milestones

### M0 - Core Planner (done)
- MCU + sensor selection
- Auto allocation + conflicts
- Visual pin map + wiring
- Save/load projects

### M1 - Devtool Pack (done)
- SPL templates with sensor stubs
- Critical pin constraints + conflict details
- Hardware export (pin usage, wiring list, BOM)
- Offline catalog import templates (CSV/JSON)

### M2 - Planning Intelligence (next)
- Sensor placement near closest pins by signal usage
- Address/bus capacity checks (I2C address, SPI CS budgeting)
- Power domain checks (3.3V/5V compatibility hints)
- Constraint editor + per-project overrides

### M3 - Build Outputs
- Hardware exports in CSV (pin usage, wiring list, BOM)
- Netlist export (basic)
- KiCad footprint mapping (starter set)

### M4 - PCB Workflow
- Basic schematic drafting data
- JLC-style BOM/PNP export
- Footprint validation reports

### M5 - Data Pipeline
- Vendor PDF parsing helpers
- Catalog versioning + merge tooling
- Custom rule packs (per MCU family)
