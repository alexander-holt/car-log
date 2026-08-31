import legacy from "@vitejs/plugin-legacy";
import vue from "@vitejs/plugin-vue";
import path from "path";
import { normalizePath } from "vite";
import { viteStaticCopy } from "vite-plugin-static-copy";
import { defineConfig } from "vitest/config";

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        vue(),
        legacy(),
        viteStaticCopy({
            targets: [
                {
                    src: normalizePath(
                        path.resolve(
                            __dirname,
                            "./node_modules/sql.js/dist/sql-wasm.wasm",
                        ),
                    ),
                    dest: "assets",
                    rename: { stripBase: true },
                },
            ],
        }),
    ],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
    test: {
        globals: true,
        environment: "jsdom",
        include: ["tests/unit/**/*.test.ts", "tests/unit/**/*.spec.ts"],
    },
});
