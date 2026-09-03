<script setup lang="ts">
import {
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonIcon,
    IonInput,
    IonItem,
    IonList,
    IonNote,
    IonTitle,
    IonToolbar,
    modalController,
    toastController,
} from "@ionic/vue";
import { alertCircleOutline } from "ionicons/icons";
import { computed, nextTick, reactive, ref } from "vue";
import {
    normalizeOptionalText,
    normalizeVin,
    validateVehicle,
} from "@/services/serviceRecordValidation";
import type { Vehicle } from "@/types";

const props = defineProps<{
    vehicle?: Vehicle;
}>();

const isEditMode = computed(() => props.vehicle !== undefined);
const showValidationErrors = ref(false);
const formRef = ref<HTMLFormElement | null>(null);
let validationToast: HTMLIonToastElement | null = null;

const ISSUE_SCROLL_DURATION_MS = 180;
const ISSUE_SCROLL_MAX_TOP_OFFSET_PX = 96;

const formData = reactive({
    make: props.vehicle?.make ?? "",
    model: props.vehicle?.model ?? "",
    year: props.vehicle?.year ?? new Date().getFullYear(),
    vin: props.vehicle?.vin ?? "",
    licensePlate: props.vehicle?.licensePlate ?? "",
    engineType: props.vehicle?.engineType ?? "",
    currentMileage: props.vehicle?.currentMileage ?? null,
});

const normalizedVehicle = computed<Omit<Vehicle, "id">>(() => {
    const mileage =
        formData.currentMileage === null ||
        String(formData.currentMileage).trim() === ""
            ? undefined
            : Number(formData.currentMileage);

    return {
        make: formData.make.trim(),
        model: formData.model.trim(),
        year: Number(formData.year),
        vin: normalizeVin(formData.vin),
        licensePlate: normalizeOptionalText(formData.licensePlate),
        engineType: normalizeOptionalText(formData.engineType),
        currentMileage: mileage,
        mileageUpdatedAt: props.vehicle?.mileageUpdatedAt,
        mileageReminderIntervalDays: props.vehicle?.mileageReminderIntervalDays,
        mileageRemindersEnabled: props.vehicle?.mileageRemindersEnabled,
    };
});

const validationIssues = computed(() =>
    validateVehicle(normalizedVehicle.value),
);
const isFormValid = computed(() => validationIssues.value.length === 0);

function errorFor(path: string): string | undefined {
    if (!showValidationErrors.value) {
        return undefined;
    }
    return validationIssues.value.find((issue) => issue.path === path)?.message;
}

function issueSummary(): string {
    const count = validationIssues.value.length;
    return `${count} ${count === 1 ? "field needs" : "fields need"} attention.`;
}

async function dismissValidationToast(): Promise<void> {
    if (!validationToast) {
        return;
    }

    const toast = validationToast;
    validationToast = null;
    await toast.dismiss();
}

async function showValidationFailureToast(): Promise<void> {
    await dismissValidationToast();
    const toast = await toastController.create({
        id: "vehicle-validation",
        message: `Vehicle not saved. ${issueSummary()}`,
        color: "danger",
        duration: 2800,
        position: "bottom",
    });
    validationToast = toast;
    await toast.present();
}

async function scrollToFirstIssue(): Promise<void> {
    const firstIssue = validationIssues.value[0];
    if (!firstIssue) {
        return;
    }

    await nextTick();
    const field = formRef.value?.querySelector<HTMLElement>(
        `[data-field-path="${firstIssue.path}"]`,
    );
    if (!field) {
        return;
    }

    const content = field.closest<HTMLIonContentElement>("ion-content");
    if (!content?.getScrollElement || !content.scrollToPoint) {
        field.scrollIntoView({ behavior: "auto", block: "center" });
        return;
    }

    const scrollElement = await content.getScrollElement();
    const scrollBounds = scrollElement.getBoundingClientRect();
    const fieldBounds = field.getBoundingClientRect();
    const topOffset = Math.min(
        ISSUE_SCROLL_MAX_TOP_OFFSET_PX,
        scrollBounds.height * 0.18,
    );
    const destination = Math.max(
        0,
        scrollElement.scrollTop +
            fieldBounds.top -
            scrollBounds.top -
            topOffset,
    );

    await content.scrollToPoint(
        undefined,
        destination,
        ISSUE_SCROLL_DURATION_MS,
    );
}

async function cancel(): Promise<void> {
    await dismissValidationToast();
    void modalController.dismiss(null, "cancel");
}

async function saveVehicle(): Promise<void> {
    showValidationErrors.value = true;
    if (!isFormValid.value) {
        const toastPromise = showValidationFailureToast();
        await scrollToFirstIssue();
        await toastPromise;
        return;
    }

    await dismissValidationToast();
    void modalController.dismiss(normalizedVehicle.value, "confirm");
}
</script>

<template>
    <ion-header>
        <ion-toolbar>
            <ion-buttons slot="start">
                <ion-button @click="cancel">Cancel</ion-button>
            </ion-buttons>
            <ion-title>
                {{ isEditMode ? "Edit vehicle" : "Add vehicle" }}
            </ion-title>
            <ion-buttons slot="end">
                <ion-button class="save-button" @click="saveVehicle">
                    Save
                </ion-button>
            </ion-buttons>
        </ion-toolbar>
    </ion-header>

    <ion-content>
        <form
            ref="formRef"
            class="cl-form vehicle-form"
            @submit.prevent="saveVehicle"
        >
            <div
                v-if="showValidationErrors && !isFormValid"
                class="validation-summary"
                role="alert"
            >
                <ion-icon aria-hidden="true" :icon="alertCircleOutline" />
                <span>{{ issueSummary() }}</span>
            </div>

            <section class="form-section" aria-labelledby="vehicle-title">
                <h2 id="vehicle-title">Vehicle</h2>
                <ion-list class="form-group" lines="full">
                    <ion-item>
                        <ion-input
                            v-model="formData.make"
                            data-field-path="make"
                            label="Make *"
                            label-placement="stacked"
                            autocomplete="organization"
                            required
                        />
                    </ion-item>
                    <ion-note
                        v-if="errorFor('make')"
                        class="field-error"
                        color="danger"
                    >
                        {{ errorFor("make") }}
                    </ion-note>

                    <ion-item>
                        <ion-input
                            v-model="formData.model"
                            data-field-path="model"
                            label="Model *"
                            label-placement="stacked"
                            required
                        />
                    </ion-item>
                    <ion-note
                        v-if="errorFor('model')"
                        class="field-error"
                        color="danger"
                    >
                        {{ errorFor("model") }}
                    </ion-note>

                    <ion-item>
                        <ion-input
                            v-model="formData.year"
                            data-field-path="year"
                            label="Year *"
                            label-placement="stacked"
                            type="number"
                            inputmode="numeric"
                            min="1886"
                            step="1"
                            required
                        />
                    </ion-item>
                    <ion-note
                        v-if="errorFor('year')"
                        class="field-error"
                        color="danger"
                    >
                        {{ errorFor("year") }}
                    </ion-note>
                </ion-list>
            </section>

            <section class="form-section" aria-labelledby="details-title">
                <h2 id="details-title">Details</h2>
                <ion-list class="form-group" lines="full">
                    <ion-item>
                        <ion-input
                            v-model="formData.currentMileage"
                            data-field-path="currentMileage"
                            label="Current mileage"
                            label-placement="stacked"
                            type="number"
                            inputmode="numeric"
                            min="0"
                            step="1"
                        >
                            <span slot="end" class="field-affix">mi</span>
                        </ion-input>
                    </ion-item>
                    <ion-note
                        v-if="errorFor('currentMileage')"
                        class="field-error"
                        color="danger"
                    >
                        {{ errorFor("currentMileage") }}
                    </ion-note>

                    <ion-item>
                        <ion-input
                            v-model="formData.licensePlate"
                            label="License plate"
                            label-placement="stacked"
                            autocapitalize="characters"
                        />
                    </ion-item>

                    <ion-item>
                        <ion-input
                            v-model="formData.vin"
                            data-field-path="vin"
                            label="VIN"
                            label-placement="stacked"
                            placeholder="17-character VIN"
                            autocapitalize="characters"
                            :maxlength="17"
                        />
                    </ion-item>
                    <ion-note
                        v-if="errorFor('vin')"
                        class="field-error"
                        color="danger"
                    >
                        {{ errorFor("vin") }}
                    </ion-note>

                    <ion-item>
                        <ion-input
                            v-model="formData.engineType"
                            label="Engine"
                            label-placement="stacked"
                            placeholder="V6, EV, Hybrid"
                        />
                    </ion-item>
                </ion-list>
            </section>
        </form>
    </ion-content>
</template>

<style scoped>
.vehicle-form {
    width: min(100%, 46rem);
    margin: 0 auto;
    padding: 1rem var(--cl-page-gutter) 2rem;
}

.validation-summary {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    align-items: center;
    gap: 0.625rem;
    margin-bottom: 1rem;
    padding: 0.75rem 1rem;
    border: 1px solid var(--cl-danger);
    border-radius: var(--cl-card-radius);
    background: var(--cl-danger-soft);
    color: var(--cl-danger);
    font-size: 0.9375rem;
    font-weight: 550;
}

.validation-summary ion-icon {
    font-size: 1.125rem;
}

.form-section + .form-section {
    margin-top: 1.75rem;
}

.form-section > h2 {
    margin: 0 0 0.625rem;
    font-size: 1.125rem;
    font-weight: 700;
    letter-spacing: -0.01em;
}

.form-group {
    overflow: hidden;
    margin: 0;
    padding: 0;
    border: 1px solid var(--cl-border);
    border-radius: var(--cl-card-radius);
    background: var(--cl-surface);
    box-shadow: var(--cl-card-shadow);
}

.form-group ion-item {
    --background: transparent;
    --border-color: var(--cl-border);
}

.field-error {
    display: block;
    margin: 0;
    padding-block: 0.5rem 0.625rem;
    border-bottom: 1px solid var(--cl-border);
    background: var(--cl-danger-soft);
    font-size: 0.8125rem;
}

.save-button {
    font-weight: 650;
}
</style>
