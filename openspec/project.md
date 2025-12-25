# Project Context

## Purpose
PinForge is a local desktop web app to help embedded developers plan STM32 pin usage, select sensors, and avoid conflicts. It visualizes MCU pins, routes sensor connections, and exports pin maps for further hardware work.

## Tech Stack
- TypeScript
- React
- Vite
- Tauri (desktop shell)
- Rust (Tauri build/runtime)
- CSS (plain)

## Project Conventions

### Code Style
- Keep edits ASCII-only when possible.
- Prefer clear, component-level CSS in `src/App.css`.
- Keep UI strings centralized (e.g., `copy` object in `src/App.tsx`).
- Use descriptive component/handler names (e.g., `handleExportJson`).

### Architecture Patterns
- React single-page UI with Tauri wrapper.
- Data lives in `src/data/` (MCU and sensor catalogs).
- Allocation and export logic in `src/lib/`.
- Types in `src/types`.
- DOM-based wiring: pin pads are DOM nodes, lines drawn via SVG paths.

### Testing Strategy
- No automated tests yet.
- Manual visual verification for layout, pin mapping, and wiring.

### Git Workflow
- Default branch: `main`.
- Commit messages: concise, imperative (e.g., `feat: add sensor layout`).
- Remote origin: https://github.com/kipp7/flushbonading

## Domain Context
- Focus on STM32 MCU pin planning and sensor selection.
- Supported interfaces: I2C, SPI, UART, ADC, PWM, 1-Wire (demo scope).
- Goal: avoid pin conflicts and provide clear wiring visualization.

## Important Constraints
- Must work offline with local demo data until vendor data is integrated.
- UI should be clean, modern, and hardware-oriented.

## External Dependencies
- None (local demo data only).
