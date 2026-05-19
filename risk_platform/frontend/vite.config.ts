import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["images/*.jpg", "images/*.png"],
      manifest: {
        name: "CreditRiskAI — Loan Risk Intelligence",
        short_name: "CreditRiskAI",
        description: "AI-powered loan risk assessment for Zimbabwe's financial sector",
        theme_color: "#0f1419",
        background_color: "#0f1419",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "/images/hero-farmer.jpg", sizes: "192x192", type: "image/jpeg", purpose: "any maskable" },
        ],
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024, // 4 MiB — needed for @react-pdf bundle
        globPatterns: ["**/*.{js,css,html,ico,png,jpg,svg,woff2}"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: { cacheName: "google-fonts-cache", expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
          {
            urlPattern: /\/api\/v1\/dashboard\/.*/i,
            handler: "NetworkFirst",
            options: { cacheName: "api-dashboard-cache", expiration: { maxEntries: 5, maxAgeSeconds: 300 } },
          },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
    },
  },
});
