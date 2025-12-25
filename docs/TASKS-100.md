# PinForge 100-Task Plan

## Notes
- Tasks are ordered for steady execution.
- Each task should be tracked and checked off after completion.

## Tasks
1. [ ] Write TECH_STACK.md with exact versions and toolchain.
2. [ ] Write ARCHITECTURE.md with module boundaries and data flow.
3. [ ] Centralize app constants (window sizes, colors, grid) in one config.
4. [ ] Add project schema versioning and migration hook.
5. [ ] Add feature-flag toggles for experimental features.
6. [ ] Add React error boundary with a friendly fallback.
7. [ ] Add a lightweight toast/notice component for import/export feedback.
8. [ ] Add a logging utility for allocator/import/export debug.
9. [ ] Add persistent UI settings store (local only).
10. [ ] Add reset-to-defaults action for settings.
11. [ ] Add an About panel with version/build info.
12. [ ] Add a simple diagnostics panel (runtime env, file paths).
13. [ ] Add catalog schema version field to import templates.
14. [ ] Add JSON validation for sensor catalogs.
15. [ ] Add JSON validation for MCU catalogs.
16. [ ] Add JSON validation for constraint catalogs.
17. [ ] Improve CSV parser (quoted fields, escaped commas).
18. [ ] Add import preview table for sensor catalogs.
19. [ ] Add import preview table for MCU catalogs.
20. [ ] Add import preview for constraints.
21. [ ] Add merge/replace toggle for sensor imports.
22. [ ] Add merge/replace toggle for MCU imports.
23. [ ] Add replace-only flow for constraint imports.
24. [ ] Add duplicate ID resolver UI (rename/skip).
25. [ ] Add import summary (counts + errors).
26. [ ] Add export of current sensor catalog to JSON.
27. [ ] Add export of current sensor catalog to CSV.
28. [ ] Add export of current MCU catalog to JSON.
29. [ ] Add export of current MCU catalog to CSV.
30. [ ] Add catalog search by id/name with quick filters.
31. [ ] Add sensor category tags and grouping.
32. [ ] Add sensor sort options (name/interface/newest).
33. [ ] Add constraint editor list (enable/disable).
34. [ ] Add constraint add/edit dialog.
35. [ ] Add constraint delete/restore defaults.
36. [ ] Add per-project constraint overrides (saved in project file).
37. [ ] Add soft constraint severity and warning view.
38. [ ] Add BOOT/NRST rules per MCU series.
39. [ ] Add oscillator (HSE/LSE) rules per MCU series.
40. [ ] Add SWD rule toggle per project.
41. [ ] Add power pin checks (VDD/VSS integrity hints).
42. [ ] Add I2C address collision detection.
43. [ ] Add SPI CS budget check (max CS pins).
44. [ ] Add UART exclusivity check (one device per UART).
45. [ ] Add PWM/ADC overlap warnings.
46. [ ] Add pin capability mismatch conflicts.
47. [ ] Add manual pin reserve list (protect pins).
48. [ ] Add allocator deterministic ordering guarantee.
49. [ ] Add allocation balancing (minimize cross-board wiring).
50. [ ] Add allocator debug export (JSON).
51. [ ] Add canvas zoom controls.
52. [ ] Add canvas pan controls.
53. [ ] Add reset-view button.
54. [ ] Add sensor auto-position by closest pins.
55. [ ] Add sensor orientation controls (left/right/top/bottom).
56. [ ] Add sensor pin order alignment with physical header.
57. [ ] Add MCU package outline variants (64/100/144).
58. [ ] Add pin density scaling for large packages.
59. [ ] Add wire routing mode toggle (spline/orthogonal).
60. [ ] Add wire hover highlight and focus.
61. [ ] Add pin hover highlight across MCU/sensor.
62. [ ] Add basic wire collision avoidance.
63. [ ] Add constraint legend in canvas.
64. [ ] Add bus usage badges in right panel.
65. [ ] Add resizable side panels.
66. [ ] Add compact layout for small screens.
67. [ ] Add subtle board texture/background choices.
68. [ ] Add interface filter chips for sensors.
69. [ ] Add sensor favorite/star list.
70. [ ] Add multi-select sensors (shift-click).
71. [ ] Add keyboard shortcuts (save/export/reset).
72. [ ] Add pin tooltip with alternate functions list.
73. [ ] Add sensor tooltip with full description.
74. [ ] Add wiring summary overlay near MCU.
75. [ ] Add mini-map overview for large boards.
76. [ ] Add SPL GPIO init per pin function (input/output/AF).
77. [ ] Add SPL bus init parameters per speed preset.
78. [ ] Add SPL I2C read/write helper stubs.
79. [ ] Add SPL SPI read/write helper stubs.
80. [ ] Add SPL UART send/receive helper stubs.
81. [ ] Add SPL ADC init with channel list stubs.
82. [ ] Add SPL PWM init with timer stubs.
83. [ ] Add hardware export CSV: pin usage.
84. [ ] Add hardware export CSV: wiring list.
85. [ ] Add hardware export CSV: BOM.
86. [ ] Add export bundle (zip) with all outputs.
87. [ ] Add export naming presets (project name).
88. [ ] Add constraint export to JSON.
89. [ ] Add allocation export to JSON (detailed).
90. [ ] Add project summary export (markdown).
91. [ ] Add persistent autosave to local file.
92. [ ] Add recent projects list.
93. [ ] Add project rename + metadata.
94. [ ] Add project duplicate/clone.
95. [ ] Add project template starter files.
96. [ ] Add settings panel (language/theme/units).
97. [ ] Add offline cache for last-used catalogs.
98. [ ] Add onboarding tutorial overlay.
99. [ ] Add local changelog view.
100. [ ] Add regression checklist (allocator + layout).
