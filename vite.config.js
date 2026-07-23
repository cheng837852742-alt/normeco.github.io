import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const projectRoot = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  base: "./",
  build: {
    outDir: "cad-dist",
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(projectRoot, "cad-src/configurator.js"),
      output: {
        entryFileNames: "bit-configurator.js",
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]"
      }
    }
  },
  worker: {
    format: "es"
  }
});
