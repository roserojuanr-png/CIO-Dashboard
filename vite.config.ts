import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import fs from "node:fs";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    allowedHosts: ["westcx-cio-dashboard.local"],
    https: {
      key: fs.readFileSync(path.resolve(__dirname, "./certs/localhost-key.pem")),
      cert: fs.readFileSync(path.resolve(__dirname, "./certs/localhost-cert.pem")),
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
