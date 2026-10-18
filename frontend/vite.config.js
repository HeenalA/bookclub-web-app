import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    sourcemap: false,
    rollupOptions: {
      output: {
        /* Split the dependencies out of the app code.
           LEARNING: this is about caching, not size — the total bytes are the
           same. React and supabase-js change only when you upgrade them,
           while app code changes every deploy. In one bundle, editing a
           button forces everyone to re-download React too. Split, the vendor
           file keeps its filename and stays in the browser cache across
           deploys. */
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("@supabase")) return "supabase";
          if (/node_modules\/(react|react-dom|react-router)/.test(id)) {
            return "react";
          }
          return "vendor";
        },
      },
    },
  },
  server: {
    port: 3000,
    open: true,
  },
});
