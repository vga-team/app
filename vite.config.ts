import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig({
  base: "",
  plugins: [
    VitePWA({
      registerType: "autoUpdate",
      devOptions: {
        enabled: true,
      },
      manifest: {
        name: "GWF Vis App",
        short_name: "GWFVis",
        description: "GWF Vis App",
        theme_color: "#ffffff",
        icons: [
          {
            src: "./icons/gwf-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "./icons/gwf-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
        file_handlers: [
          {
            action: "./",
            accept: {
              "application/json": [".gwfvisconf"],
            },
          },
        ],
      },
    }),
  ],
});
