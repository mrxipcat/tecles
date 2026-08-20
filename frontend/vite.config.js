import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
        // Igual que Azure Static Web Apps (Managed Functions), que consumeix el
        // prefix "/api" abans d'invocar la Function: el backend FastAPI no en
        // registra les rutes amb aquest prefix (vegeu backend/app/main.py).
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});
