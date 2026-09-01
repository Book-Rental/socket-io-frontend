import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import cssInjectedByJsPlugin from "vite-plugin-css-injected-by-js";

export default defineConfig({
  plugins: [
    react(),
    cssInjectedByJsPlugin(),
  ],

  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, "index.html"),
        widget: path.resolve(__dirname, "src/index.widget.tsx"),
      },

      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === "widget") {
            return "socket_io_widget.js";
          }

          return "assets/[name]-[hash].js";
        },
      },
    },

    minify: true,
  },

  define: {
    "process.env": {},
  },
});