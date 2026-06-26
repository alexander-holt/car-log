<script setup lang="ts">
import { useVehicleStore } from "@/store/vehicleStore";
import {
    IonPage,
    IonButtons,
    IonBackButton,
    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle,
} from "@ionic/vue";
import { computed } from "vue";
import { useRoute } from "vue-router";

const route = useRoute();
const vehicleStore = useVehicleStore();

const vehicleId = route.params.id as string;

const vehicle = computed(() =>
    vehicleStore.vehicles.find((v) => v.id === vehicleId),
);
</script>

<template>
    <ion-page>
        <ion-header :translucent="true">
            <ion-toolbar>
                <ion-buttons slot="start">
                    <ion-back-button default-href="/home"></ion-back-button>
                </ion-buttons>
                <ion-title>
                    {{
                        vehicle
                            ? `${vehicle.year} ${vehicle.make} ${vehicle.model}`
                            : "Vehicle Details"
                    }}
                </ion-title>
            </ion-toolbar>
        </ion-header>

        <ion-content id="main-content" :fullscreen="true">
            <ion-header collapse="condense">
                <ion-toolbar>
                    <ion-title size="large">
                        {{
                            vehicle
                                ? `${vehicle.year} ${vehicle.make} ${vehicle.model}`
                                : "Vehicle Details"
                        }}
                    </ion-title>
                </ion-toolbar>
            </ion-header>
            <div v-if="vehicle">
                <p>
                    <strong>License Plate:</strong>
                    {{ vehicle.licensePlate || "N/A" }}
                </p>
                <p>
                    <strong>Current Mileage:</strong>
                    {{ vehicle.currentMileage?.toLocaleString() || "N/A" }}
                </p>
            </div>
            <div v-else>
                <p>Vehicle not found.</p>
            </div>
        </ion-content>
    </ion-page>
</template>
