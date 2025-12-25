import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync } from "node:fs";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: (() => {
    try {
      const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf-8")) as {
        name?: string;
        version?: string;
      };
      return {
        __PINFORGE_NAME__: JSON.stringify(pkg.name ?? "pinforge"),
        __PINFORGE_VERSION__: JSON.stringify(pkg.version ?? "0.0.0"),
        __PINFORGE_BUILD_TIME__: JSON.stringify(new Date().toISOString()),
      };
    } catch {
      return {
        __PINFORGE_NAME__: JSON.stringify("pinforge"),
        __PINFORGE_VERSION__: JSON.stringify("0.0.0"),
        __PINFORGE_BUILD_TIME__: JSON.stringify(new Date().toISOString()),
      };
    }
  })(),
});
