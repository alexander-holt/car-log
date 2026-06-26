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
                    label="Make *"
                    label-placement="floating"
                    v-model="formData.make"
                    required
                ></ion-input>
            </ion-item>
            <ion-item>
                <ion-input
                    label="Model *"
                    label-placement="floating"
                    v-model="formData.model"
                    required
                ></ion-input>
            </ion-item>
            <ion-item>
                <ion-input
                    label="Year *"
                    label-placement="floating"
                    type="number"
                    v-model="formData.year"
                    required
                ></ion-input>
            </ion-item>
            <ion-item>
                <ion-input
                    label="VIN"
                    label-placement="floating"
                    v-model="formData.vin"
                ></ion-input>
            </ion-item>
            <ion-item>
                <ion-input
                    label="License Plate"
                    label-placement="floating"
                    v-model="formData.licensePlate"
                ></ion-input>
            </ion-item>
            <ion-item>
                <ion-input
                    label="Engine Type"
                    label-placement="floating"
                    v-model="formData.engineType"
                    placeholder="e.g., V6, EV, Hybrid"
                ></ion-input>
            </ion-item>
            <ion-item>
                <ion-input
                    label="Current Mileage"
                    label-placement="floating"
                    type="number"
                    v-model="formData.currentMileage"
                ></ion-input>
            </ion-item>
        </ion-list>

        <ion-button
            expand="block"
            class="ion-margin-top"
            @click="saveVehicle"
            :disabled="!isFormValid"
        >
            {{ isEditMode ? "Update Vehicle" : "Save Vehicle" }}
        </ion-button>
    </ion-content>
</template>

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
