# PinForge

Local desktop web app for STM32 pin planning and sensor fit. This MVP uses demo data to validate the flow: select MCU, select sensors, auto-check conflicts, export pin maps.

## Features

- MCU selector (F1/F4/G0/H7 demo subsets)
- Sensor library (I2C/SPI/UART/ADC/PWM/1-Wire)
- Auto allocation + conflict reporting
- Canvas zoom/pan + hover highlight (pins/wires)
- Export `pinmap.json` and `pinmap.csv`
- Project save/load (`pinforge_project.json`)
- Custom sensor templates
- Manual pin locks per signal
- Export SPL starter code (`*_spl.c`) with sensor placeholders (speed preset + I2C helper stubs)
- Critical pin constraints (SWD/BOOT/OSC) + conflict details
- Hardware export (`*_hardware.json`) with pin usage, wiring list, BOM summary
- Hardware CSV exports (pin usage / wiring / BOM)
- Export bundle (`*_bundle.zip`) with `manifest.json` + selected outputs
- Offline catalog import templates (MCU/Sensor/Constraint CSV or JSON)

## Run (Desktop)

```bash
npm install
npm run dev
```

## Run (Web Only)

```bash
npm run dev:web
```

## Run (Desktop via Tauri)

Requires Rust toolchain and platform build tools.

```bash
npm install
npm run tauri dev
```

## Data

Demo datasets live in:

- `src/data/mcus.ts`
- `src/data/sensors.ts`
- `src/data/constraints.ts`

Replace these with vendor databases / PDF-derived data when ready.

## Import Templates

Use the in-app Data Tools panel to download CSV/JSON templates and import local catalogs. Imports open a preview first, and sensor/MCU imports support explicit Merge or Replace modes.

## Checks

```bash
npm run check:allocator
npm run check:offline
```

## Git Remote Workflow

```bash
git init
git branch -M main
git remote add origin https://github.com/kipp7/flushbonading
git add .
git commit -m "chore: init"
git push -u origin main
```
