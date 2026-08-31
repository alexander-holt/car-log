import { ref } from "vue";

export const bootstrapError = ref<string | null>(null);

export function setBootstrapError(error: unknown): void {
    bootstrapError.value =
        error instanceof Error
            ? error.message
            : "An unknown startup error occurred.";
}
