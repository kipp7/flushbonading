# Execution Agent Instructions (MS01)

This file mirrors the MS01 execution constraints used by the Chief Architect to supervise delivery.

## Source of Truth
- Super Milestone: `docs/MS_01_SUPER_MILESTONE.txt`
- Execution protocol: `docs/EXECUTION_AGENT_PROTOCOL.txt`
- OpenSpec workflow: `openspec/AGENTS.md`

## Anti-Goals
See `docs/MS_01_SUPER_MILESTONE.txt` for the definitive list, including:
- No cloud sync or accounts
- No required online dependencies
- No HAL/LL code generation
- No PDF parsing pipeline
- No schematic/netlist/PCB export in MS01

## OpenSpec Acceptance
- All approved changes must validate: `openspec validate <change-id> --strict`
- Implement features to match OpenSpec scenarios before marking tasks complete.

## Directory Conventions
- `openspec/specs/` is built truth.
- `openspec/changes/` is proposals (do not implement without approval).
- Domain logic: `src/lib/*`
- Demo catalogs: `src/data/*`
- UI composition: `src/*`
