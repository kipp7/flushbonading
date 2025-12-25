# Execution Agent Guide: MS 01

This guide is written for the Execution Agent. It defines what to read, what to do, what not to do, and how to report.

## 0. Mandatory Reads (in this order, before any code changes)
1. `AGENTS.md` (engineering constitution)
2. `openspec/AGENTS.md` (OpenSpec workflow and formatting rules)
3. `docs/EXECUTION_AGENT_PROTOCOL.txt` (reporting and gates)
4. `docs/MS_01_SUPER_MILESTONE.txt` (MS 01 scope, batches, acceptance criteria)
5. `openspec/changes/update-pinforge-m2-foundation/proposal.md`
6. `openspec/changes/update-pinforge-m2-foundation/design.md`
7. `openspec/changes/update-pinforge-m2-foundation/tasks.md`
8. `docs/TASKS-240.md` (master plan; map work to it)

## 1. Mission
Implement MS 01 end-to-end (Batches 01-07) and produce a single milestone report after all batches pass all gates.

## 2. Hard Constraints (Do Not Violate)
- No runtime network dependency.
- No HAL/LL output; SPL only.
- No new frameworks.
- No unrelated refactors.
- Any new capability must be proposed in OpenSpec first.

## 3. Batch Execution Order
Execute sequentially:
1. Batch 01 Governance and Spec Truth
2. Batch 02 App Shell Foundation
3. Batch 03 Data Tooling and Catalog Pipeline
4. Batch 04 Constraints Editor and Overrides
5. Batch 05 Planning Intelligence
6. Batch 06 Canvas and UX Upgrades
7. Batch 07 Exports and Codegen Expansion

## 4. Completion Gate for Each Batch (Self-Check Triad)
Before marking a batch as done:
1. Static checks: `npm run lint` and `npm run build`
2. Key-path checks: `npm run check:allocator` and `npm run check:offline`
3. Update task status files:
   - Check off completed items in `openspec/changes/update-pinforge-m2-foundation/tasks.md`
   - Check off mapped items in `docs/TASKS-240.md`

## 5. OpenSpec Gate (Before Final Report)
Before the milestone report:
- Run: `openspec validate update-pinforge-m2-foundation --strict`
- If validation fails, fix deltas, scenarios, or structure until it passes.

## 6. If Blocked (Do Not Stop)
If any error or blocker occurs:
1. Produce a troubleshooting checklist (what you checked, what you observed).
2. Provide Plan A (conservative fix) and Plan B (aggressive fix).
3. Continue with the chosen plan without waiting, unless the decision would destroy data or change core business scope.

## 7. Final Milestone Report (Single Report Only)
The final report MUST include:
1. High-level summary of changes by batch.
2. Heartbeat lines (one per completed batch): `Task [xx/xx] Batch Done: <batch-id> <short label>`
3. Validation outputs:
   - `npm run lint`
   - `npm run build`
   - `npm run check:allocator`
   - `npm run check:offline`
   - `openspec validate update-pinforge-m2-foundation --strict`
4. Key files changed list.
5. Risks and follow-ups.
6. A final code block titled: STRICT GOVERNANCE AUDIT REQUEST

The STRICT GOVERNANCE AUDIT REQUEST code block MUST ask the Chief Architect to:
1. Perform a gap analysis versus OpenSpec scenarios and MS 01 acceptance criteria.
2. Make a binary decision: accept or reject, citing deviations if rejected.
3. Update the Project Supervision Memory.

