## 1. Governance and Specs
- [x] 1.1 Ensure baseline specs exist under `openspec/specs/` for all current capabilities
- [x] 1.2 Validate existing active changes and decide archive plan
- [x] 1.3 Add architecture and tech stack docs for reproducible builds

## 2. App Shell Foundation
- [x] 2.1 Add error boundary and user visible feedback for failures
- [x] 2.2 Add toast notifications for import, export, save, load
- [x] 2.3 Add settings persistence (local only) and a reset action
- [x] 2.4 Add About and Diagnostics panels

## 3. Data Tooling
- [x] 3.1 Add schema versions to templates and imported payloads
- [x] 3.2 Add import preview, merge or replace semantics, and summary reporting
- [x] 3.3 Add catalog export for sensors, MCUs, and constraints

## 4. Constraints and Intelligence
- [x] 4.1 Add constraint editor UI, soft warnings, and per project overrides
- [x] 4.2 Add planning intelligence checks (I2C address collisions, CS budgeting, UART exclusivity, capability mismatches)
- [x] 4.3 Add deterministic allocator ordering guarantee and debug export

## 5. Canvas UX and Exports
- [x] 5.1 Add zoom, pan, and hover focus for wires and pins
- [x] 5.2 Add sensor orientation controls and improved auto placement
- [x] 5.3 Add hardware CSV exports and a consistent export bundle format
- [x] 5.4 Extend SPL codegen with helper stubs and speed presets

## 6. Validation
- [x] 6.1 Run allocator and offline checks in scripts
- [x] 6.2 Run lint and build for both web and Tauri targets
- [x] 6.3 Update regression checklist and manual QA notes
