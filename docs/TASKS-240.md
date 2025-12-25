# PinForge Master Task Plan (240 Items)

## Reporting Protocol
- The implementer reports only after completing an entire phase.
- Each phase is treated as a single delivery milestone.
- No per-task status updates unless explicitly requested.

## Phase 01 - Baseline, Specs, Governance (001-030)
1. [ ] 001: Inventory implemented features vs OpenSpec changes (core + devtools).
2. [ ] 002: Run `openspec validate add-pinforge-core --strict` and record issues.
3. [ ] 003: Run `openspec validate add-pinforge-embedded-devtools --strict` and record issues.
4. [ ] 004: Decide archival plan for the two existing changes after verification.
5. [ ] 005: Create base specs under openspec/specs/ for core capabilities (if missing).
6. [ ] 006: Create base specs under openspec/specs/ for devtools capabilities (if missing).
7. [ ] 007: Add traceability map (features -> modules -> specs).
8. [ ] 008: Write TECH_STACK.md with exact versions and toolchain.
9. [ ] 009: Write ARCHITECTURE.md with module boundaries and data flow.
10. [ ] 010: Centralize app constants (window sizes, colors, grid) in one config.
11. [ ] 011: Add project schema versioning and migration hook.
12. [ ] 012: Add feature-flag toggles for experimental features.
13. [ ] 013: Add React error boundary with a friendly fallback.
14. [ ] 014: Add a lightweight toast/notice component for import/export feedback.
15. [ ] 015: Add a logging utility for allocator/import/export debug.
16. [ ] 016: Add persistent UI settings store (local only).
17. [ ] 017: Add reset-to-defaults action for settings.
18. [ ] 018: Add an About panel with version/build info.
19. [ ] 019: Add a simple diagnostics panel (runtime env, file paths).
20. [ ] 020: Add design tokens (CSS variables) for core colors/spacing.
21. [ ] 021: Add types for settings + feature flags in src/types.ts.
22. [ ] 022: Add docs for data schema (MCU, sensor, constraint).
23. [ ] 023: Add docs for export file formats and naming rules.
24. [ ] 024: Add docs for project file format and versioning.
25. [ ] 025: Add contributor onboarding notes (local dev, Tauri).
26. [ ] 026: Add regression checklist doc (allocator + layout).
27. [ ] 027: Add offline verification notes to docs (no network calls).
28. [ ] 028: Add release checklist doc (manual QA, build outputs).
29. [ ] 029: Add UI string registry rule (copy map coverage).
30. [ ] 030: Add lint rule or script for unused copy strings.

## Phase 02 - Catalog Import/Export (031-060)
31. [ ] 031: Add catalog schema version field to import templates.
32. [ ] 032: Update sensor JSON template to include schema/version metadata.
33. [ ] 033: Update sensor CSV template to include schema/version metadata.
34. [ ] 034: Update MCU JSON template to include schema/version metadata.
35. [ ] 035: Update MCU CSV template to include schema/version metadata.
36. [ ] 036: Update constraint JSON template to include schema/version metadata.
37. [ ] 037: Add JSON validation for sensor catalogs.
38. [ ] 038: Add JSON validation for MCU catalogs.
39. [ ] 039: Add JSON validation for constraint catalogs.
40. [ ] 040: Improve CSV parser (quoted fields, escaped commas).
41. [ ] 041: Add parser tests or scripted checks for CSV edge cases.
42. [ ] 042: Add import preview table for sensor catalogs.
43. [ ] 043: Add import preview table for MCU catalogs.
44. [ ] 044: Add import preview for constraints.
45. [ ] 045: Add merge/replace toggle for sensor imports.
46. [ ] 046: Add merge/replace toggle for MCU imports.
47. [ ] 047: Add replace-only flow for constraint imports.
48. [ ] 048: Add duplicate ID resolver UI (rename/skip).
49. [ ] 049: Add import summary (counts + errors).
50. [ ] 050: Add import error list panel with row-level messages.
51. [ ] 051: Add export of current sensor catalog to JSON.
52. [ ] 052: Add export of current sensor catalog to CSV.
53. [ ] 053: Add export of current MCU catalog to JSON.
54. [ ] 054: Add export of current MCU catalog to CSV.
55. [ ] 055: Add export of current constraint catalog to JSON.
56. [ ] 056: Add catalog search by id/name with quick filters.
57. [ ] 057: Add sensor category tags and grouping.
58. [ ] 058: Add sensor sort options (name/interface/newest).
59. [ ] 059: Add MCU series filter improvements.
60. [ ] 060: Add saved catalog persistence (custom MCUs/sensors/constraints).

## Phase 03 - Constraint System (061-090)
61. [ ] 061: Draft OpenSpec proposal for constraint editor + overrides.
62. [ ] 062: Extend PinConstraint model (enabled, severity, source).
63. [ ] 063: Add constraint editor list (enable/disable).
64. [ ] 064: Add constraint add/edit dialog.
65. [ ] 065: Add constraint delete/restore defaults.
66. [ ] 066: Add per-project constraint overrides (saved in project file).
67. [ ] 067: Add UI toggle for project vs global constraints.
68. [ ] 068: Add soft constraint severity and warning view.
69. [ ] 069: Add SWD rule toggle per project.
70. [ ] 070: Add BOOT/NRST rules per MCU series.
71. [ ] 071: Add oscillator (HSE/LSE) rules per MCU series.
72. [ ] 072: Add power pin checks (VDD/VSS integrity hints).
73. [ ] 073: Add constraint legend in canvas.
74. [ ] 074: Add constraint badges in pin list rows.
75. [ ] 075: Add constraint packs per MCU series.
76. [ ] 076: Add constraint import validation for new fields.
77. [ ] 077: Add constraint export to JSON (with schema/version).
78. [ ] 078: Add constraint rule documentation in templates.
79. [ ] 079: Add rule duplication checks and warnings.
80. [ ] 080: Add UI filter for active constraints.
81. [ ] 081: Add allocator conflict detail for constraint source/rule.
82. [ ] 082: Add rule enable/disable bulk actions.
83. [ ] 083: Add manual pin reserve list (constraint-backed).
84. [ ] 084: Add reserved pin guard (cannot unreserve power/SWD).
85. [ ] 085: Add per-sensor forbidden pins (override list).
86. [ ] 086: Add constraint health diagnostics (unused, conflicting).
87. [ ] 087: Add warnings for sensors requiring forbidden pins.
88. [ ] 088: Add ability to temporarily disable a constraint in UI.
89. [ ] 089: Add localization strings for new constraint UI.
90. [ ] 090: Update docs/ROADMAP and docs/BACKLOG for constraint progress.

## Phase 04 - Allocation Intelligence (091-120)
91. [ ] 091: Draft OpenSpec proposal for planning intelligence rules.
92. [ ] 092: Add I2C address metadata to sensor models.
93. [ ] 093: Add I2C address collision detection.
94. [ ] 094: Add UI warnings for I2C address conflicts.
95. [ ] 095: Add SPI CS budget check (max CS pins per bus).
96. [ ] 096: Add UI hints when CS budget exceeded.
97. [ ] 097: Add UART exclusivity check (one device per UART).
98. [ ] 098: Add PWM/ADC overlap warnings.
99. [ ] 099: Add pin capability mismatch conflicts.
100. [ ] 100: Add manual pin reserve list in allocator logic.
101. [ ] 101: Add allocator deterministic ordering guarantee.
102. [ ] 102: Add allocation balancing (minimize cross-board wiring).
103. [ ] 103: Add allocator debug export (JSON).
104. [ ] 104: Add allocator debug panel (optional UI).
105. [ ] 105: Add tests or scripted checks for new rules.
106. [ ] 106: Add bus capacity counters in allocation summary.
107. [ ] 107: Add unassigned reason codes for new conflicts.
108. [ ] 108: Add per-sensor power domain metadata (3.3V/5V).
109. [ ] 109: Add power domain compatibility hints.
110. [ ] 110: Add per-sensor voltage mismatch warnings.
111. [ ] 111: Add sensor-to-bus affinity scoring for placement.
112. [ ] 112: Add allocator debug logging toggle.
113. [ ] 113: Add config flags for rule enable/disable.
114. [ ] 114: Add export data fields for new conflict reasons.
115. [ ] 115: Add docs with allocator rule summary.
116. [ ] 116: Add OpenSpec scenarios for new allocation rules.
117. [ ] 117: Add manual override to force bus selection.
118. [ ] 118: Add pin capability overlay in UI.
119. [ ] 119: Add performance guard for large sensor sets.
120. [ ] 120: Update regression checklist for allocator changes.

## Phase 05 - Canvas + UX (121-160)
121. [ ] 121: Add canvas zoom controls.
122. [ ] 122: Add canvas pan controls.
123. [ ] 123: Add reset-view button.
124. [ ] 124: Add sensor auto-position by closest pins.
125. [ ] 125: Add sensor orientation controls (left/right/top/bottom).
126. [ ] 126: Add sensor pin order alignment with physical header.
127. [ ] 127: Add MCU package outline variants (64/100/144).
128. [ ] 128: Add pin density scaling for large packages.
129. [ ] 129: Add wire routing mode toggle (spline/orthogonal).
130. [ ] 130: Add wire hover highlight and focus.
131. [ ] 131: Add pin hover highlight across MCU/sensor.
132. [ ] 132: Add basic wire collision avoidance.
133. [ ] 133: Add constraint legend in canvas (if not already).
134. [ ] 134: Add bus usage badges in right panel.
135. [ ] 135: Add resizable side panels.
136. [ ] 136: Add compact layout for small screens.
137. [ ] 137: Add subtle board texture/background choices.
138. [ ] 138: Add interface filter chips for sensors.
139. [ ] 139: Add sensor favorite/star list.
140. [ ] 140: Add multi-select sensors (shift-click).
141. [ ] 141: Add keyboard shortcuts (save/export/reset).
142. [ ] 142: Add pin tooltip with alternate functions list.
143. [ ] 143: Add sensor tooltip with full description.
144. [ ] 144: Add wiring summary overlay near MCU.
145. [ ] 145: Add mini-map overview for large boards.
146. [ ] 146: Add board snapping/grid guidelines.
147. [ ] 147: Add draggable sensor reorder list in sidebar.
148. [ ] 148: Add visual indicator for locked pins on MCU.
149. [ ] 149: Add reset layout action for sensors.
150. [ ] 150: Add center MCU action.
151. [ ] 151: Add selection outline for active sensor.
152. [ ] 152: Add quick toggle to hide wires.
153. [ ] 153: Add zoom-to-fit for selected sensor.
154. [ ] 154: Add high-contrast mode toggle.
155. [ ] 155: Add loading skeleton for catalog fetch/load.
156. [ ] 156: Add search highlight in sensor list.
157. [ ] 157: Add GPU-friendly wire rendering optimization.
158. [ ] 158: Add mousewheel zoom and trackpad pan.
159. [ ] 159: Add UI toggle to show/hide pin labels.
160. [ ] 160: Add accessibility pass (tab order, aria labels).

## Phase 06 - Codegen + Exports (161-190)
161. [ ] 161: Draft OpenSpec proposal for codegen + export expansion.
162. [ ] 162: Add SPL GPIO init per pin function (input/output/AF).
163. [ ] 163: Add SPL bus init parameters per speed preset.
164. [ ] 164: Add SPL I2C read/write helper stubs.
165. [ ] 165: Add SPL SPI read/write helper stubs.
166. [ ] 166: Add SPL UART send/receive helper stubs.
167. [ ] 167: Add SPL ADC init with channel list stubs.
168. [ ] 168: Add SPL PWM init with timer stubs.
169. [ ] 169: Add hardware export CSV: pin usage.
170. [ ] 170: Add hardware export CSV: wiring list.
171. [ ] 171: Add hardware export CSV: BOM.
172. [ ] 172: Add export bundle (zip) with all outputs.
173. [ ] 173: Add export naming presets (project name).
174. [ ] 174: Add constraint export to JSON (if not already).
175. [ ] 175: Add allocation export to JSON (detailed).
176. [ ] 176: Add project summary export (markdown).
177. [ ] 177: Add SPL code formatting pass (indentation).
178. [ ] 178: Add template for sensor driver stub packs.
179. [ ] 179: Add export metadata file (schema version, timestamp).
180. [ ] 180: Add UI panel for export options (format selection).
181. [ ] 181: Add validation for export results.
182. [ ] 182: Add automated export test script.
183. [ ] 183: Add per-bus codegen grouping (I2C1, SPI2).
184. [ ] 184: Add codegen for bus pin remap comments.
185. [ ] 185: Add codegen for sensor placeholder per interface.
186. [ ] 186: Add BOM aggregation (by part id).
187. [ ] 187: Add hardware export includes power pins.
188. [ ] 188: Add CSV delimiter options (comma/semicolon).
189. [ ] 189: Add export success toast with file names.
190. [ ] 190: Update README/docs for new outputs.

## Phase 07 - Project Management + Settings (191-220)
191. [ ] 191: Add persistent autosave to local file.
192. [ ] 192: Add recent projects list.
193. [ ] 193: Add project rename + metadata.
194. [ ] 194: Add project duplicate/clone.
195. [ ] 195: Add project template starter files.
196. [ ] 196: Add settings panel (language/theme/units).
197. [ ] 197: Add offline cache for last-used catalogs.
198. [ ] 198: Add onboarding tutorial overlay.
199. [ ] 199: Add local changelog view.
200. [ ] 200: Add regression checklist (allocator + layout) reference in UI.
201. [ ] 201: Add project schema version migration implementation.
202. [ ] 202: Add project summary panel (read-only stats).
203. [ ] 203: Add project export of notes/comments.
204. [ ] 204: Add project-level tags/labels.
205. [ ] 205: Add quick new project wizard.
206. [ ] 206: Add file picker for project location (Tauri).
207. [ ] 207: Add project auto-backup rotation.
208. [ ] 208: Add unsaved changes indicator.
209. [ ] 209: Add confirmation dialogs for destructive actions.
210. [ ] 210: Add keyboard shortcut for project save/load.
211. [ ] 211: Add project import merge (sensors and MCUs).
212. [ ] 212: Add snapshot export (PNG of board).
213. [ ] 213: Add project metadata in exports (author/date).
214. [ ] 214: Add settings sync with local file.
215. [ ] 215: Add settings reset wiring to defaults.
216. [ ] 216: Add demo data reset action.
217. [ ] 217: Add system diagnostics exports.
218. [ ] 218: Add support bundle export for debugging.
219. [ ] 219: Add doc: project file format and migrations.
220. [ ] 220: Add manual checklist for project flows QA.

## Phase 08 - Data Pipeline + Quality (221-240)
221. [ ] 221: Draft OpenSpec proposal for data pipeline foundation.
222. [ ] 222: Add catalog versioning model (metadata + changelog).
223. [ ] 223: Add catalog merge tooling (diff + merge).
224. [ ] 224: Add catalog conflict resolution UI.
225. [ ] 225: Add vendor PDF extraction helper (stub CLI).
226. [ ] 226: Add parsing pipeline doc (PDF to JSON).
227. [ ] 227: Add rule scripting engine stub for constraints.
228. [ ] 228: Add plugin pack format spec (MCUs, sensors, rules).
229. [ ] 229: Add import of plugin packs (local zip).
230. [ ] 230: Add sample plugin pack in repo.
231. [ ] 231: Add large catalog performance benchmark script.
232. [ ] 232: Add allocator performance profiling toggle.
233. [ ] 233: Add data normalization utilities (pin naming).
234. [ ] 234: Add MCU pin alternate functions import (CSV).
235. [ ] 235: Add bus metadata import (I2C/SPI/UART).
236. [ ] 236: Add catalog lint script (schema + uniqueness).
237. [ ] 237: Add data validation report export.
238. [ ] 238: Add fallback to legacy catalog format.
239. [ ] 239: Add data migration guide for vendors.
240. [ ] 240: Add QA sweep: manual test matrix updated.
