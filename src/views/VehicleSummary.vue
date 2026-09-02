<script setup lang="ts">
import ServiceRecordCard from "@/components/ServiceRecordCard.vue";
import ServiceRecordFormModal from "@/components/ServiceRecordFormModal.vue";
import { useServiceRecordStore } from "@/store/serviceRecordStore";
import { useVehicleStore } from "@/store/vehicleStore";
import type { ServiceRecord } from "@/types";
import {
    IonBackButton,
    IonButton,
    IonButtons,
    IonContent,
    IonFab,
    IonFabButton,
    IonHeader,
    IonIcon,
    IonNote,
    IonPage,
    IonSpinner,
    IonTitle,
    IonToolbar,
    alertController,
    modalController,
    onIonViewWillEnter,
    toastController,
} from "@ionic/vue";
import { add } from "ionicons/icons";
import { computed, ref } from "vue";
import { useRoute } from "vue-router";

const route = useRoute();
const vehicleStore = useVehicleStore();
const recordStore = useServiceRecordStore();
const saving = ref(false);

const vehicleId = route.params.id as string;
const vehicle = computed(() =>
    vehicleStore.vehicles.find((candidate) => candidate.id === vehicleId),
);

function messageFor(error: unknown): string {
    return error instanceof Error
        ? error.message
        : "An unexpected service history error occurred.";
}

async function showToast(
    message: string,
    color: "success" | "danger",
): Promise<void> {
    const toast = await toastController.create({
        message,
        color,
        duration: 2500,
        position: "bottom",
    });
    await toast.present();
}

async function fetchRecords(): Promise<void> {
    if (!vehicleId) {
        return;
    }

    try {
        await recordStore.loadRecords(vehicleId);
    } catch {
        // The store error renders below with a retry action.
    }
}

onIonViewWillEnter(fetchRecords);

async function openRecordModal(existingRecord?: ServiceRecord): Promise<void> {
    if (!vehicle.value) {
        return;
    }

    const modal = await modalController.create({
        component: ServiceRecordFormModal,
        componentProps: {
            vehicleId,
            record: existingRecord,
            currentMileage: vehicle.value.currentMileage,
        },
    });
    await modal.present();

    const { data, role } = await modal.onWillDismiss<ServiceRecord>();
    if (role !== "confirm" || !data) {
        return;
    }

    saving.value = true;
    try {
        if (existingRecord) {
            await recordStore.updateRecord(data);
            await showToast("Service record updated.", "success");
        } else {
            await recordStore.addRecord(data);
            await showToast("Service record saved.", "success");
        }
    } catch (error) {
        await showToast(
            `Could not save service record. ${messageFor(error)}`,
            "danger",
        );
    } finally {
        saving.value = false;
    }
}

async function deleteRecord(record: ServiceRecord): Promise<void> {
    saving.value = true;
    try {
        await recordStore.deleteRecord(record.id);
        await showToast("Service record deleted.", "success");
    } catch (error) {
        await showToast(
            `Could not delete service record. ${messageFor(error)}`,
            "danger",
        );
    } finally {
        saving.value = false;
    }
}

async function confirmDelete(record: ServiceRecord): Promise<void> {
    const itemWord = record.items.length === 1 ? "item" : "items";
    const alert = await alertController.create({
        header: "Delete service record?",
        message: `This will permanently remove the record, its ${record.items.length} service ${itemWord}, and their details.`,
        buttons: [
            { text: "Cancel", role: "cancel" },
            {
                text: "Delete",
                role: "destructive",
                handler: () => {
                    void deleteRecord(record);
                },
            },
        ],
    });
    await alert.present();
}
</script>

<template>
    <ion-page>
        <ion-header :translucent="true">
            <ion-toolbar>
                <ion-buttons slot="start">
                    <ion-back-button default-href="/home" />
                </ion-buttons>
                <ion-title>
                    {{
                        vehicle
                            ? `${vehicle.year} ${vehicle.make} ${vehicle.model}`
                            : "Vehicle details"
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
                                : "Vehicle details"
                        }}
                    </ion-title>
                </ion-toolbar>
            </ion-header>

            <section v-if="vehicle" class="vehicle-summary">
                <p>
                    <strong>License plate:</strong>
                    {{ vehicle.licensePlate || "Not entered" }}
                </p>
                <p>
                    <strong>Current mileage:</strong>
                    {{
                        vehicle.currentMileage === undefined
                            ? "Not entered"
                            : `${vehicle.currentMileage.toLocaleString()} mi`
                    }}
                </p>
            </section>
            <section v-else class="state-message" role="alert">
                <h2>Vehicle not found</h2>
                <p>Return to My Garage and choose a vehicle.</p>
            </section>

            <section v-if="vehicle" aria-labelledby="history-title">
                <h2 id="history-title">Service history</h2>

                <div
                    v-if="recordStore.loading"
                    class="state-message"
                    aria-live="polite"
                >
                    <ion-spinner name="crescent" />
                    <p>Loading service history…</p>
                </div>

                <div
                    v-else-if="recordStore.error"
                    class="state-message"
                    role="alert"
                >
                    <ion-note color="danger">
                        Could not load service history. {{ recordStore.error }}
                    </ion-note>
                    <ion-button fill="outline" @click="fetchRecords">
                        Retry
                    </ion-button>
                </div>

                <div v-else-if="recordStore.records.length > 0">
                    <ServiceRecordCard
                        v-for="record in recordStore.records"
                        :key="record.id"
                        :record="record"
                        @edit="openRecordModal"
                        @delete="confirmDelete"
                    />
                </div>

                <div v-else class="state-message">
                    <h3>No service records yet</h3>
                    <p>Tap the + button to log DIY work or a shop visit.</p>
                </div>
            </section>

            <div v-if="saving" class="saving-indicator" aria-live="polite">
                <ion-spinner name="crescent" />
                <span>Saving…</span>
            </div>

            <ion-fab
                v-if="vehicle"
                slot="fixed"
                vertical="bottom"
                horizontal="end"
            >
                <ion-fab-button
                    aria-label="Add service record"
                    :disabled="saving || recordStore.loading"
                    @click="openRecordModal()"
                >
                    <ion-icon :icon="add" />
                </ion-fab-button>
            </ion-fab>
        </ion-content>
    </ion-page>
</template>

<style scoped>
.vehicle-summary {
    border-bottom: 1px solid var(--ion-color-step-150, #d7d8da);
    margin-bottom: 1rem;
}

.state-message {
    display: grid;
    justify-items: center;
    gap: 0.75rem;
    padding: 2rem 1rem;
    text-align: center;
}

.state-message > * {
    margin: 0;
}

.saving-indicator {
    position: fixed;
    right: 1rem;
    bottom: 5.5rem;
    z-index: 10;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    border-radius: 999px;
    background: var(--ion-color-light);
    box-shadow: 0 2px 12px rgb(0 0 0 / 18%);
}
</style>
