
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/gradio_api": {
        target: "https://4ea61054e974876bc9.gradio.live",
        changeOrigin: true,
        secure: true,
      },
    },
  },
});
