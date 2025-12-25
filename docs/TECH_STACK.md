# Tech Stack

This document describes the exact toolchain and runtime dependencies used by PinForge.

## Runtime
- Desktop shell: Tauri `2.9.6`
- UI: React `19.2.3`
- Build tooling: Vite `7.3.0`
- Language: TypeScript `5.9.3`

## Toolchain (tested)
- Node.js `v24.12.0`
- npm `11.6.2`
- Rust `1.92.0`
- cargo `1.92.0`

## NPM Dependencies (top level)
See `package.json` and the lockfile for the full tree.

### deps
- `react` `19.2.3`
- `react-dom` `19.2.3`

### devDeps
- `@tauri-apps/cli` `2.9.6`
- `vite` `7.3.0`
- `typescript` `5.9.3`
- `tsx` `4.21.0`
- `eslint` `9.39.2`
- `concurrently` `9.2.1`

## Constraints
- Offline-first: no required network calls at runtime.
- SPL-only: generated code must not output HAL/LL.
