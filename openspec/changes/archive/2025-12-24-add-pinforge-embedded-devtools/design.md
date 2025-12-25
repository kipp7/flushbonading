## Context
PinForge already provides visual pin planning and basic SPL export. The next step is to add devtool features that help embedded developers move from planning to implementation without leaving the app.

## Goals / Non-Goals
- Goals:
  - Provide SPL-only template code for allocated buses and sensor skeletons.
  - Enforce and explain critical pin constraints (SWD/BOOT/OSC/etc.).
  - Export practical hardware artifacts (pin usage, wiring list, BOM summary).
  - Import MCU/sensor catalogs from local JSON/CSV without network access.
- Non-Goals:
  - No HAL/LL code output.
  - No online vendor APIs or cloud workflows in this change.

## Decisions
- Decision: Keep outputs SPL-only and avoid HAL/LL to match user preference and reduce conflicts.
- Decision: Implement constraint checks inside allocator to reuse existing conflict display.
- Decision: Keep import format local and simple (JSON/CSV templates) to stay offline-first.

## Risks / Trade-offs
- Risk: Constraints may mark pins unusable and reduce available allocations.
  - Mitigation: Provide explicit conflict reasons and keep rule set configurable.
- Risk: Import validation may reject partial data.
  - Mitigation: Support minimal required fields and provide clear error messages.

## Migration Plan
- Introduce new exporters/importers behind existing UI controls.
- Keep existing exports intact; add new formats alongside.

## Open Questions
- Which CSV/JSON schema should be the first default for MCU and sensor catalogs?
- How detailed should SPL sensor placeholders be for each interface?
