import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [tailwindcss(), react()],
  server: {
    proxy: {
      "/api": {
        target: "http://127.0.0.1:2000",
        changeOrigin: true,
      },
      "/auth": {
        target: "http://127.0.0.1:2000",
        changeOrigin: true,
      },
    },
  },
});
