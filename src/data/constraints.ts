import type { PinConstraint } from "../types";

export const defaultConstraints: PinConstraint[] = [
  {
    id: "swd",
    label: "SWD Debug",
    pins: ["PA13", "PA14"],
    level: "hard",
    enabled: true,
    source: "default",
    reason: "Keep debug pins free for SWD programming.",
    series: ["F1", "F4", "G0", "H7"],
  },
  {
    id: "boot",
    label: "BOOT Strap",
    pins: ["BOOT0"],
    level: "hard",
    enabled: true,
    source: "default",
    reason: "BOOT pin controls boot mode.",
    series: ["F1", "G0", "H7"],
  },
  {
    id: "reset",
    label: "NRST",
    pins: ["NRST"],
    level: "hard",
    enabled: true,
    source: "default",
    reason: "Reset pin should remain dedicated.",
    series: ["F1", "F4", "G0", "H7"],
  },
  {
    id: "lse",
    label: "LSE Oscillator",
    pins: ["PC14", "PC15"],
    level: "hard",
    enabled: true,
    source: "default",
    reason: "Low-speed external oscillator pins.",
    series: ["F1", "F4", "G0", "H7"],
  },
];
