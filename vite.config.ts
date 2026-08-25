import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from "path";
import cssInjectedByJsPlugin from "vite-plugin-css-injected-by-js";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), cssInjectedByJsPlugin()],

   build: {
    lib: {
      entry: path.resolve(__dirname, "src/index.widget.tsx"),
      name: "SocketIOWidget",
      formats: ["iife"],
      fileName: () => "socket_io_widget.js",
    },
    rollupOptions: {
      external: [],
    },
    minify: true,
  },

   define: {
    "process.env": {},
  },
  
})
