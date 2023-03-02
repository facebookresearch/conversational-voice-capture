import { resolve } from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      {
        find: /~(.+)/,
        replacement: "../node_modules/$1",
      },
      { find: /@\/(.+)/, replacement: resolve(__dirname, "./src/$1") },
    ],
  },
});
