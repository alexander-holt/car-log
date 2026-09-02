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
    modalController,
    onIonViewWillEnter,
    toastController,
} from "@ionic/vue";
import { add } from "ionicons/icons";
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

const route = useRoute();
const router = useRouter();
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
    color: "primary" | "danger",
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

async function openRecordModal(): Promise<void> {
    if (!vehicle.value) {
        return;
    }

    const modal = await modalController.create({
        component: ServiceRecordFormModal,
        componentProps: {
            vehicleId,
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
        await recordStore.addRecord(data);
        await showToast("Service record saved.", "primary");
    } catch (error) {
        await showToast(
            `Could not save service record. ${messageFor(error)}`,
            "danger",
        );
    } finally {
        saving.value = false;
    }
}

function openRecord(record: ServiceRecord): void {
    void router.push({
        name: "ServiceRecordDetail",
        params: {
            vehicleId,
            recordId: record.id,
        },
    });
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

            <main class="vehicle-page">
                <section v-if="vehicle" class="vehicle-summary">
                    <dl>
                        <div>
                            <dt>Current mileage</dt>
                            <dd>
                                {{
                                    vehicle.currentMileage === undefined
                                        ? "Not entered"
                                        : `${vehicle.currentMileage.toLocaleString()} mi`
                                }}
                            </dd>
                        </div>
                        <div>
                            <dt>License plate</dt>
                            <dd>{{ vehicle.licensePlate || "Not entered" }}</dd>
                        </div>
                    </dl>
                </section>
                <section v-else class="state-message" role="alert">
                    <h2>Vehicle not found</h2>
                    <p>Return to My Garage and choose a vehicle.</p>
                </section>

                <section
                    v-if="vehicle"
                    class="history-section"
                    aria-labelledby="history-title"
                >
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
                            Could not load service history.
                            {{ recordStore.error }}
                        </ion-note>
                        <ion-button fill="outline" @click="fetchRecords">
                            Retry
                        </ion-button>
                    </div>

                    <div
                        v-else-if="recordStore.records.length > 0"
                        class="record-list"
                    >
                        <ServiceRecordCard
                            v-for="record in recordStore.records"
                            :key="record.id"
                            :record="record"
                            @open="openRecord"
                        />
                    </div>

                    <div v-else class="state-message empty-history">
                        <h3>No service records yet</h3>
                        <p>Tap the + button to log DIY work or a shop visit.</p>
                    </div>
                </section>
            </main>

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
.vehicle-page {
    width: min(100%, 46rem);
    margin: 0 auto;
}

.vehicle-summary {
    overflow: hidden;
    border: 1px solid var(--cl-border);
    border-radius: var(--cl-card-radius);
    background: var(--cl-surface);
    box-shadow: var(--cl-card-shadow);
}

.vehicle-summary dl {
    margin: 0;
}

.vehicle-summary dl > div {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.75rem 1rem;
}

.vehicle-summary dl > div + div {
    border-top: 1px solid var(--cl-border);
}

.vehicle-summary dt {
    color: var(--cl-text-muted);
    font-size: 0.875rem;
}

.vehicle-summary dd {
    margin: 0;
    color: var(--cl-text);
    font-size: 0.9375rem;
    font-weight: 650;
    font-variant-numeric: tabular-nums;
    text-align: end;
}

.history-section {
    margin-top: 1.75rem;
}

.history-section > h2 {
    margin: 0 0 0.75rem;
    font-size: 1.5rem;
    letter-spacing: -0.02em;
}

.record-list {
    display: grid;
    gap: 0;
}

.empty-history {
    border: 1px dashed var(--cl-border);
    border-radius: var(--cl-card-radius);
    background: var(--cl-surface);
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
    border: 1px solid var(--cl-border);
    border-radius: 999px;
    background: var(--cl-surface);
    box-shadow: var(--cl-card-shadow);
}
</style>
