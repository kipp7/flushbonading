import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve("src");
const patterns = [
  /fetch\s*\(/,
  /axios\s*\./,
  /XMLHttpRequest/,
  /WebSocket/,
  /https?:\/\//,
];

const matches = [];

const scanDir = (dir) => {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      scanDir(full);
      continue;
    }
    if (!/\.(ts|tsx|js|jsx|css|html)$/.test(entry)) continue;
    const content = readFileSync(full, "utf8");
    patterns.forEach((pattern) => {
      if (pattern.test(content)) {
        matches.push(`${full}: ${pattern}`);
      }
    });
  }
};

scanDir(root);

if (matches.length > 0) {
  console.error("Offline check failed. Network patterns found:");
  matches.forEach((line) => console.error(`- ${line}`));
  process.exit(1);
}

console.log("Offline check passed.");
