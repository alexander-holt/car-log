module.exports = {
    root: true,
    env: {
        node: true,
    },
    extends: [
        "plugin:vue/vue3-recommended",
        "eslint:recommended",
        "@vue/typescript/recommended",
        "prettier",
    ],
    plugins: [
        "prettier"
    ]
    parserOptions: {
        ecmaVersion: 2020,
    },
    rules: {
        "no-console": process.env.NODE_ENV === "production" ? "warn" : "off",
        "no-debugger": process.env.NODE_ENV === "production" ? "warn" : "off",
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
        "vue/component-tags-order": [
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
};
