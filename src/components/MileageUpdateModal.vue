<script setup lang="ts">
import {
    IonButton,
    IonButtons,
    IonCheckbox,
    IonContent,
    IonHeader,
    IonInput,
    IonItem,
    IonList,
    IonNote,
    IonTitle,
    IonToggle,
    IonToolbar,
    modalController,
} from "@ionic/vue";
import { computed, reactive, ref } from "vue";
import type { MileageUpdate } from "@/store/vehicleStore";
import type { Vehicle } from "@/types";

const props = defineProps<{ vehicle: Vehicle }>();

const formData = reactive({
    mileage: props.vehicle.currentMileage ?? null,
    allowCorrection: false,
    mileageReminderIntervalDays:
        props.vehicle.mileageReminderIntervalDays ?? 30,
    mileageRemindersEnabled: props.vehicle.mileageRemindersEnabled ?? true,
});
const submitted = ref(false);

const mileage = computed(() =>
    formData.mileage === null || String(formData.mileage).trim() === ""
        ? Number.NaN
        : Number(formData.mileage),
);
const isCorrection = computed(
    () =>
        props.vehicle.currentMileage !== undefined &&
        Number.isFinite(mileage.value) &&
        mileage.value < props.vehicle.currentMileage,
);
const mileageError = computed(() => {
    if (!Number.isSafeInteger(mileage.value) || mileage.value < 0) {
        return "Mileage must be a whole number zero or greater.";
    }
    if (isCorrection.value && !formData.allowCorrection) {
        return "Confirm that this lower mileage is an odometer correction.";
    }
    return undefined;
});
const intervalError = computed(() =>
    !Number.isSafeInteger(Number(formData.mileageReminderIntervalDays)) ||
    Number(formData.mileageReminderIntervalDays) <= 0
        ? "Reminder interval must be a whole number of days greater than zero."
        : undefined,
);

function cancel(): void {
    void modalController.dismiss(null, "cancel");
}

function save(): void {
    submitted.value = true;
    if (mileageError.value || intervalError.value) {
        return;
    }
    const update: MileageUpdate = {
        mileage: mileage.value,
        allowCorrection: formData.allowCorrection,
        mileageReminderIntervalDays: Number(
            formData.mileageReminderIntervalDays,
        ),
        mileageRemindersEnabled: formData.mileageRemindersEnabled,
    };
    void modalController.dismiss(update, "confirm");
}
</script>

<template>
    <ion-header>
        <ion-toolbar>
            <ion-buttons slot="start">
                <ion-button @click="cancel">Cancel</ion-button>
            </ion-buttons>
            <ion-title>Update mileage</ion-title>
            <ion-buttons slot="end">
                <ion-button @click="save">Save</ion-button>
            </ion-buttons>
        </ion-toolbar>
    </ion-header>
    <ion-content>
        <form class="cl-form mileage-form" @submit.prevent="save">
            <p>When parked, enter the current odometer reading.</p>
            <ion-list class="form-group" lines="full">
                <ion-item>
                    <ion-input
                        v-model="formData.mileage"
                        data-field-path="currentMileage"
                        label="Current mileage *"
                        label-placement="stacked"
                        type="number"
                        inputmode="numeric"
                        min="0"
                        step="1"
                    >
                        <span slot="end">mi</span>
                    </ion-input>
                </ion-item>
                <ion-note
                    v-if="submitted && mileageError"
                    color="danger"
                    class="field-error"
                >
                    {{ mileageError }}
                </ion-note>
                <ion-item v-if="isCorrection" lines="none">
                    <ion-checkbox
                        v-model="formData.allowCorrection"
                        justify="space-between"
                    >
                        This is an odometer correction
                    </ion-checkbox>
                </ion-item>
            </ion-list>

            <h2>Mileage reminder</h2>
            <ion-list class="form-group" lines="full">
                <ion-item>
                    <ion-toggle
                        v-model="formData.mileageRemindersEnabled"
                        justify="space-between"
                    >
                        Show in-app reminder
                    </ion-toggle>
                </ion-item>
                <ion-item>
                    <ion-input
                        v-model="formData.mileageReminderIntervalDays"
                        data-field-path="mileageReminderIntervalDays"
                        :disabled="!formData.mileageRemindersEnabled"
                        label="Remind me after"
                        label-placement="stacked"
                        type="number"
                        inputmode="numeric"
                        min="1"
                        step="1"
                    >
                        <span slot="end">days</span>
                    </ion-input>
                </ion-item>
                <ion-note
                    v-if="submitted && intervalError"
                    color="danger"
                    class="field-error"
                >
                    {{ intervalError }}
                </ion-note>
            </ion-list>
        </form>
    </ion-content>
</template>

<style scoped>
.mileage-form {
    width: min(100%, 36rem);
    margin: 0 auto;
    padding: 1rem var(--cl-page-gutter) 2rem;
}

.mileage-form > p {
    margin: 0 0 1rem;
    color: var(--cl-text-muted);
}

.mileage-form h2 {
    margin: 1.5rem 0 0.625rem;
    font-size: 1.125rem;
}

.form-group {
    overflow: hidden;
    margin: 0;
    padding: 0;
    border: 1px solid var(--cl-border);
    border-radius: var(--cl-card-radius);
    background: var(--cl-surface);
}

.field-error {
    display: block;
    padding: 0.625rem 1rem;
    border-bottom: 1px solid var(--cl-border);
    background: var(--cl-danger-soft);
}
</style>
