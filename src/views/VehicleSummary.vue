<script setup lang="ts">
import { useVehicleStore } from "@/store/vehicleStore";
import { useRecordStore } from "@/store/recordStore";
import MaintenanceRecordCard from "@/components/MaintenanceRecordCard.vue";
import {
    IonPage,
    IonButtons,
    IonBackButton,
    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle,
    onIonViewWillEnter,
} from "@ionic/vue";
import { computed, onMounted } from "vue";
import { useRoute } from "vue-router";
import { modalController, IonFab, IonFabButton, IonIcon } from "@ionic/vue";
import { add } from "ionicons/icons";
import { v4 as uuidv4 } from "uuid";
import MaintenanceRecordFormModal from "@/components/MaintenanceRecordFormModal.vue";
import type { MaintenanceRecord } from "@/types";

const route = useRoute();
const vehicleStore = useVehicleStore();
const recordStore = useRecordStore();

const vehicleId = route.params.id as string;

const vehicle = computed(() =>
    vehicleStore.vehicles.find((v) => v.id === vehicleId),
);

async function fetchRecords() {
    if (vehicleId) {
        await recordStore.loadRecords(vehicleId);
    }
}

onMounted(fetchRecords);
onIonViewWillEnter(fetchRecords);

// async function openRecordModal(existingRecord?: MaintenanceRecord) {
//     const modal = await modalController.create({
//         component: MaintenanceRecordFormModal,
//         componentProps: {
//             record: existingRecord,
//             // Pass the vehicle's current mileage to default the form!
//             currentMileage: vehicle.value?.currentMileage,
//         },
//     });

//     await modal.present();

//     // Wait for the user to click Save or Cancel
//     const { data, role } = await modal.onWillDismiss();

//     if (role === "confirm" && data) {
//         if (existingRecord) {
//             // EDIT MODE: Merge the updated data with the existing ID and Vehicle ID
//             await recordStore.updateRecord({
//                 ...data,
//                 id: existingRecord.id,
//                 vehicleId: vehicleId,
//             });
//         } else {
//             // ADD MODE: Create a brand new ID and attach the Vehicle ID
//             await recordStore.addRecord({
//                 ...data,
//                 id: uuidv4(),
//                 vehicleId: vehicleId,
//             });
//         }

//         // Optional: If the new record's mileage is higher than the vehicle's
//         // current mileage, you might want to update the vehicleStore here too!
//     }
// }
async function openRecordModal(existingRecord?: MaintenanceRecord) {
    const modal = await modalController.create({
        component: MaintenanceRecordFormModal,
        componentProps: {
            record: existingRecord,
            currentMileage: vehicle.value?.currentMileage,
        },
    });

    await modal.present();

    // 1. Wait for the modal to close
    const { data, role } = await modal.onWillDismiss();

    console.log("Modal Dismissed! Role:", role);
    console.log("Data returned:", data);

    // 2. Check if the user clicked "Save" (confirm)
    if (role === "confirm" && data) {
        try {
            if (existingRecord) {
                console.log("Attempting to UPDATE record in database...");
                await recordStore.updateRecord({
                    ...data,
                    id: existingRecord.id,
                    vehicleId: vehicleId,
                });
            } else {
                console.log("Attempting to ADD new record to database...");
                await recordStore.addRecord({
                    ...data,
                    id: uuidv4(),
                    vehicleId: vehicleId,
                });
            }
            console.log("Database operation successful!");

            // IMPORTANT: Force a re-fetch of the records to guarantee the UI updates!
            await recordStore.loadRecords(vehicleId);
        } catch (error) {
            console.error("Failed to save to SQLite:", error);
            // This is where you would eventually add an Ionic Toast to tell the user it failed!
        }
    }
}
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

        <ion-content id="main-content" class="ion-padding" :fullscreen="true">
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

            <div v-if="recordStore.records.length > 0" class="ion-margin-top">
                <MaintenanceRecordCard
                    v-for="record in recordStore.records"
                    :key="record.id"
                    :record="record"
                ></MaintenanceRecordCard>
            </div>
            <div v-else class="ion-margin-top">
                <p>No maintenance records logged for this vehicle.</p>
            </div>

            <ion-fab slot="fixed" vertical="bottom" horizontal="end">
                <ion-fab-button @click="openRecordModal()">
                    <ion-icon :icon="add"></ion-icon>
                </ion-fab-button>
            </ion-fab>
        </ion-content>
    </ion-page>
</template>
