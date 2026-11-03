import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [svelte()],
  server: { port: 5173 },
  // Two pages: the fixtures, and the staging page the README's images are shot from.
  build: { rollupOptions: { input: ["index.html", "readme.html"] } },
});
