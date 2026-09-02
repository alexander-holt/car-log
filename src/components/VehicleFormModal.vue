<script setup lang="ts">
import { computed, reactive } from "vue";
import {
    modalController,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonContent,
    IonList,
    IonItem,
    IonInput,
    IonNote,
} from "@ionic/vue";
import { Vehicle } from "../types";
import {
    normalizeOptionalText,
    normalizeVin,
    validateVehicle,
} from "@/services/serviceRecordValidation";

const props = defineProps<{
    vehicle?: Vehicle;
}>();

const isEditMode = computed(() => !!props.vehicle);

const formData = reactive({
    make: props.vehicle?.make || "",
    model: props.vehicle?.model || "",
    year: props.vehicle?.year || new Date().getFullYear(),
    vin: props.vehicle?.vin || "",
    licensePlate: props.vehicle?.licensePlate || "",
    engineType: props.vehicle?.engineType || "",
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

const errorFor = (path: string) =>
    validationIssues.value.find((issue) => issue.path === path)?.message;

const cancel = () => {
    modalController.dismiss(null, "cancel");
};

const saveVehicle = () => {
    modalController.dismiss(normalizedVehicle.value, "confirm");
};
</script>

<template>
    <ion-header>
        <ion-toolbar>
            <ion-title>
                {{ isEditMode ? "Edit Vehicle" : "Add Vehicle" }}
            </ion-title>
            <ion-buttons slot="end">
                <ion-button @click="cancel">Cancel</ion-button>
            </ion-buttons>
        </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
        <ion-list>
            <ion-item>
                <ion-input
                    v-model="formData.make"
                    label="Make *"
                    label-placement="floating"
                    required
                ></ion-input>
            </ion-item>
            <ion-note
                v-if="errorFor('make')"
                color="danger"
                class="field-error"
            >
                {{ errorFor("make") }}
            </ion-note>
            <ion-item>
                <ion-input
                    v-model="formData.model"
                    label="Model *"
                    label-placement="floating"
                    required
                ></ion-input>
            </ion-item>
            <ion-note
                v-if="errorFor('model')"
                color="danger"
                class="field-error"
            >
                {{ errorFor("model") }}
            </ion-note>
            <ion-item>
                <ion-input
                    v-model="formData.year"
                    label="Year *"
                    label-placement="floating"
                    type="number"
                    required
                ></ion-input>
            </ion-item>
            <ion-note
                v-if="errorFor('year')"
                color="danger"
                class="field-error"
            >
                {{ errorFor("year") }}
            </ion-note>
            <ion-item>
                <ion-input
                    v-model="formData.vin"
                    label="VIN"
                    label-placement="floating"
                ></ion-input>
            </ion-item>
            <ion-note v-if="errorFor('vin')" color="danger" class="field-error">
                {{ errorFor("vin") }}
            </ion-note>
            <ion-item>
                <ion-input
                    v-model="formData.licensePlate"
                    label="License Plate"
                    label-placement="floating"
                ></ion-input>
            </ion-item>
            <ion-note
                v-if="errorFor('currentMileage')"
                color="danger"
                class="field-error"
            >
                {{ errorFor("currentMileage") }}
            </ion-note>
            <ion-item>
                <ion-input
                    v-model="formData.engineType"
                    label="Engine Type"
                    label-placement="floating"
                    placeholder="e.g., V6, EV, Hybrid"
                ></ion-input>
            </ion-item>
            <ion-item>
                <ion-input
                    v-model="formData.currentMileage"
                    label="Current Mileage"
                    label-placement="floating"
                    type="number"
                ></ion-input>
            </ion-item>
        </ion-list>

        <ion-button
            expand="block"
            class="ion-margin-top"
            :disabled="!isFormValid"
            @click="saveVehicle"
        >
            {{ isEditMode ? "Update Vehicle" : "Save Vehicle" }}
        </ion-button>
    </ion-content>
</template>

<style scoped>
.field-error {
    display: block;
    margin: 0.25rem 1rem 0.75rem;
}
</style>
