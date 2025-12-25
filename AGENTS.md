<!-- OPENSPEC:START -->
# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:
- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:
- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->

# PinForge Engineering Constitution

This `AGENTS.md` is the engineering constitution for this repository. All agents (human or AI) MUST follow it.

## 1. Product Definition
PinForge is an offline-first desktop pin planner for embedded engineers working with STM32-class MCUs. It provides:
- MCU selection and pin map visualization
- Sensor library selection and fit
- Auto allocation with conflicts and reasons
- Manual pin locks and constraints
- Wiring visualization (MCU pins to sensor signals)
- Local exports (pinmap, hardware artifacts, SPL-only templates)
- Local project save/load and local catalog import

## 2. Hard Boundaries (Anti-Goals)
- No cloud sync, accounts, collaboration, or any workflow requiring network access
- No online vendor APIs
- No HAL/LL code generation (SPL-only output)
- No in-app PDF parsing pipeline
- No full schematic/netlist/PCB flows in the core app
- No unrelated refactors or rewrites

## 3. Governance Model
Roles:
- Chief Architect (Arch-AI): designs, defines specs, defines acceptance criteria, audits milestone outputs; does not implement features
- Execution Agent: implements accepted Super Milestones end-to-end and reports only at milestone boundaries

Reporting:
- No per-task reporting
- One report per Super Milestone, after all batches are completed and all gates pass

## 4. OpenSpec Rules (Non-Negotiable)
Truth vs proposal:
- `openspec/specs/**` is the truth of what is built
- `openspec/changes/**` is proposed change and MUST be validated

When to write a proposal:
- Any new capability, architecture shift, breaking change, or behavior-changing perf/security work

Approval gate:
- Do not start implementation until the proposal is accepted by the Chief Architect

Validation:
- `openspec validate <change-id> --strict` MUST pass before reporting completion

## 5. Tech Stack (Locked Baseline)
Frontend:
- Node.js: 20 LTS (use npm; commit `package-lock.json`)
- TypeScript: 5.9.x (project references; strict)
- React: 19.2.x
- Vite: 7.2.x
- CSS: plain CSS (keep in `src/App.css`)

Desktop:
- Tauri runtime: 2.9.5
- Tauri CLI: 2.9.6
- Rust toolchain: 1.77.2 (edition 2021)

Data:
- Offline local catalogs (demo + imported) stored locally
- No database

Dependencies policy:
- Prefer zero new runtime deps
- Any new runtime dependency MUST be justified in an OpenSpec design and documented in `docs/TECH_STACK.md`

## 6. Repository Structure (Do Not Drift)
- UI: `src/App.tsx`, `src/App.css`
- Types: `src/types.ts`
- Core logic: `src/lib/*` (allocator, catalog, export, codegen)
- Demo catalogs: `src/data/*`
- Desktop shell: `src-tauri/*`
- Specs: `openspec/specs/*`
- Change proposals: `openspec/changes/*`
- Execution guides: `docs/guides/ai/*`

## 7. Project-Specific Coding Conventions
- Keep edits ASCII-only when possible
- Keep UI strings centralized (use the `copy` object in `src/App.tsx`)
- Prefer descriptive handler names (e.g., `handleExportJson`)
- Prefer component-level CSS in `src/App.css`
- Avoid adding new frameworks unless explicitly approved
- Avoid inline comments unless explicitly requested

## 8. Offline-First and Security
- App MUST remain fully usable without network access
- Do not introduce runtime fetches or remote resources
- Treat imported catalogs as untrusted input: validate, surface errors, never crash
- Keep Tauri capabilities minimal; justify any new plugin or permission

## 9. Quality Gates (Definition of Done)
All milestone work MUST pass:
- `npm run lint`
- `npm run check:allocator`
- `npm run check:offline`
- `npm run build`
- `openspec validate <change-id> --strict`

## 10. Standard Commands
- Install: `npm install`
- Web dev: `npm run dev:web`
- Desktop dev: `npm run dev` (requires Rust toolchain + platform build tools)
- Lint: `npm run lint`
- Checks: `npm run check:allocator`, `npm run check:offline`
- Build: `npm run build`
