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
} from "@ionic/vue";
import { Vehicle } from "../types";

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
    currentMileage: props.vehicle?.currentMileage || null,
});

const isFormValid = computed(() => {
    return (
        formData.make.trim() !== "" &&
        formData.model.trim() !== "" &&
        formData.year > 1885
    );
});

const cancel = () => {
    modalController.dismiss(null, "cancel");
};

const saveVehicle = () => {
    modalController.dismiss(formData, "confirm");
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
            <ion-item>
                <ion-input
                    v-model="formData.model"
                    label="Model *"
                    label-placement="floating"
                    required
                ></ion-input>
            </ion-item>
            <ion-item>
                <ion-input
                    v-model="formData.year"
                    label="Year *"
                    label-placement="floating"
                    type="number"
                    required
                ></ion-input>
            </ion-item>
            <ion-item>
                <ion-input
                    v-model="formData.vin"
                    label="VIN"
                    label-placement="floating"
                ></ion-input>
            </ion-item>
            <ion-item>
                <ion-input
                    v-model="formData.licensePlate"
                    label="License Plate"
                    label-placement="floating"
                ></ion-input>
            </ion-item>
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
