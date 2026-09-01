import js from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier/flat";
import pluginVue from "eslint-plugin-vue";
import vueTsEslintConfig from "@vue/eslint-config-typescript";
import globals from "globals";

export default [
    {
        ignores: [
            ".DS_Store",
            "node_modules/",
            "coverage/",
            "dist/",
            "ios/",
            "android/",

            // local env files
            ".env.local",
            ".env.*.local",

            // Log files
            "npm-debug.log*",
            "yarn-debug.log*",
            "yarn-error.log*",
            "pnpm-debug.log*",

            // Editor directories and files
            ".idea/",
            ".vscode/",
            "*.suo",
            "*.ntvs*",
            "*.njsproj",
            "*.sln",
            "*.sw?",
        ],
    },
    js.configs.recommended,
    ...pluginVue.configs["flat/recommended"],
    ...vueTsEslintConfig(),
    {
        languageOptions: {
            ecmaVersion: 2020,
            globals: {
                ...globals.node,
                ...globals.browser,
            },
        },
        rules: {
            "no-console":
                process.env.NODE_ENV === "production" ? "warn" : "off",
            "no-debugger":
                process.env.NODE_ENV === "production" ? "warn" : "off",
            "vue/no-deprecated-slot-attribute": "off",
            "@typescript-eslint/no-explicit-any": "off",
            "vue/attributes-order": [
                "error",
                {
                    order: [
                        "DEFINITION", // is, v-is
                        "LIST_RENDERING", // v-for
                        "CONDITIONALS", // v-if, v-else-if, v-else, v-show
                        "RENDER_MODIFIERS", // v-once, v-pre
                        "GLOBAL", // id
                        "UNIQUE", // ref, key
                        "TWO_WAY_BINDING", // v-model
                        "OTHER_ATTR", // normal props
                        "EVENTS", // @click, v-on
                        "CONTENT", // v-html, v-text
                    ],
                    alphabetical: false,
                },
            ],
            // NOTE: 'vue/component-tags-order' was deprecated and replaced by 'vue/block-order' in eslint-plugin-vue v10
            "vue/block-order": [
                "error",
                {
                    order: ["script", "template", "style"],
                },
            ],
            "vue/define-macros-order": [
                "error",
                {
                    order: [
                        "defineOptions",
                        "defineProps",
                        "defineEmits",
                        "defineSlots",
                    ],
                },
            ],
            "vue/multi-word-component-names": "off",
            "vue/no-v-html": "error",
            "vue/mustache-interpolation-spacing": ["error", "always"],
            "@typescript-eslint/no-unused-vars": [
                "warn",
                { argsIgnorePattern: "^_" },
            ],
        },
    },
    eslintConfigPrettier,
];
