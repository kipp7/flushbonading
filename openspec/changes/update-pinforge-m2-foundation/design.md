## Context
PinForge is an offline first desktop web tool for STM32 pin planning and sensor fit. It runs locally via a React plus Vite UI inside a Tauri shell. The app must remain usable with zero network access and must be robust against malformed local catalog inputs.

## Goals / Non Goals
Goals:
1. Versioned schemas for project files, exports, and catalogs, with clear migration hooks.
2. Deterministic allocator outputs and clear reasons for conflicts and warnings.
3. A stable app shell with error boundary, user feedback, and diagnostics.
4. Planning intelligence checks that prevent common board bring up issues.
5. Export outputs that are consistent, bundleable, and easy to consume in hardware workflows.

Non Goals:
1. No cloud sync, collaboration, or online vendor APIs.
2. No HAL or LL code generation.
3. No full schematic, netlist, or PCB outputs in this change.
4. No PDF parsing pipeline in this change.

## Decisions
Decision: Keep the runtime dependency surface minimal.
Rationale: Offline first and long lived tooling benefit from fewer dependencies. Prefer local utilities and scripts. Only add a dependency when it unlocks a significant user value and cannot be reasonably built in house.

Decision: Use explicit schema versions everywhere.
Rationale: Catalogs and project files evolve. A stable schemaVersion field plus a migration function prevents silent corruption and supports forward compatibility.

Decision: Separate hard conflicts from soft warnings.
Rationale: Constraints and planning checks are not always blockers. Soft issues should inform the user without blocking exports.

Decision: Define acceptance as spec scenarios plus runnable checks.
Rationale: No automated test suite exists yet. Scripted checks and a deterministic allocator provide a practical definition of done.

## Risks / Trade offs
Risk: Adding many UX and data features increases surface area for regressions.
Mitigation: Deterministic allocator, scripted checks, and an explicit regression checklist.

Risk: Schema versioning can complicate imports.
Mitigation: Keep migrations small, provide clear error messages, and ship templates that include version fields.

## Migration Plan
1. Introduce schemaVersion fields in project, exports, and catalogs.
2. Add a migrateProject function that upgrades older project versions to the latest schema.
3. Keep templates backward compatible for one major schema step, then enforce.

## Open Questions
1. Which schema versioning convention to use: integer (1,2,3) vs semver (1.0.0).
2. Whether export bundle packaging should be a zip file or a directory like set of downloads.

