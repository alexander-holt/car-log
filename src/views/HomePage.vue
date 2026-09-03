<script setup lang="ts">
import VehicleFormModal from "@/components/VehicleFormModal.vue";
import {
    compareMaintenanceUrgency,
    getMaintenanceDueState,
    scheduleName,
} from "@/services/maintenanceScheduleService";
import { getLocalDateString } from "@/services/serviceRecordValidation";
import { useMaintenanceScheduleStore } from "@/store/maintenanceScheduleStore";
import { useVehicleStore } from "@/store/vehicleStore";
import type { MaintenanceSchedule, Vehicle } from "@/types";
import {
    IonContent,
    IonFab,
    IonFabButton,
    IonHeader,
    IonIcon,
    IonItem,
    IonLabel,
    IonList,
    IonPage,
    IonTitle,
    IonToolbar,
    modalController,
    onIonViewWillEnter,
    toastController,
} from "@ionic/vue";
import {
    addOutline,
    carSportOutline,
    chevronForwardOutline,
} from "ionicons/icons";
import { ref } from "vue";
import { useRouter } from "vue-router";
import { v4 as uuidv4 } from "uuid";

const router = useRouter();
const vehicleStore = useVehicleStore();
const scheduleStore = useMaintenanceScheduleStore();
const saving = ref(false);
const today = getLocalDateString();

onIonViewWillEnter(() => {
    void loadSchedules();
});

function messageFor(error: unknown): string {
    return error instanceof Error
        ? error.message
        : "An unexpected garage error occurred.";
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

function goToVehicle(id: string): void {
    void router.push(`/vehicle/${id}`);
}

function mileageLabel(vehicle: Vehicle): string | undefined {
    return vehicle.currentMileage === undefined
        ? undefined
        : `${vehicle.currentMileage.toLocaleString()} mi`;
}

async function loadSchedules(): Promise<void> {
    try {
        await scheduleStore.loadSchedules();
    } catch {
        // The garage renders a retry action below.
    }
}

function nearestActionableSchedule(
    vehicle: Vehicle,
): MaintenanceSchedule | undefined {
    return scheduleStore.schedules
        .filter(
            (schedule) =>
                schedule.vehicleId === vehicle.id &&
                schedule.enabled &&
                getMaintenanceDueState(
                    schedule,
                    vehicle.currentMileage,
                    today,
                ) !== "UPCOMING",
        )
        .sort((first, second) =>
            compareMaintenanceUrgency(
                first,
                second,
                vehicle.currentMileage,
                today,
            ),
        )[0];
}

function maintenanceLabel(vehicle: Vehicle): string | undefined {
    const schedule = nearestActionableSchedule(vehicle);
    if (!schedule) {
        return undefined;
    }
    const state = getMaintenanceDueState(
        schedule,
        vehicle.currentMileage,
        today,
    );
    const stateLabel = state === "OVERDUE" ? "Overdue" : "Due soon";
    return `${stateLabel}: ${scheduleName(schedule)}`;
}

async function openVehicleModal(): Promise<void> {
    const modal = await modalController.create({
        component: VehicleFormModal,
        presentingElement: document.getElementById("main-content") ?? undefined,
    });
    await modal.present();

    const { data, role } = await modal.onWillDismiss<Omit<Vehicle, "id">>();
    if (role !== "confirm" || !data) {
        return;
    }

    saving.value = true;
    try {
        await vehicleStore.addVehicle({
            id: uuidv4(),
            ...data,
        });
        await showToast("Vehicle added.", "primary");
    } catch (error) {
        await showToast(
            `Could not save vehicle. ${messageFor(error)}`,
            "danger",
        );
    } finally {
        saving.value = false;
    }
}
</script>

<template>
    <ion-page>
        <ion-header :translucent="true">
            <ion-toolbar>
                <ion-title>My Garage</ion-title>
            </ion-toolbar>
        </ion-header>

        <ion-content id="main-content" :fullscreen="true">
            <ion-header collapse="condense">
                <ion-toolbar>
                    <ion-title size="large">My Garage</ion-title>
                </ion-toolbar>
            </ion-header>

            <main class="garage-page">
                <div
                    v-if="scheduleStore.error"
                    class="garage-error"
                    role="alert"
                >
                    <span>Could not load maintenance summaries.</span>
                    <button type="button" @click="loadSchedules">Retry</button>
                </div>
                <section
                    v-if="vehicleStore.vehicles.length === 0"
                    class="empty-state"
                    aria-labelledby="empty-garage-title"
                >
                    <span class="empty-state-icon">
                        <ion-icon aria-hidden="true" :icon="carSportOutline" />
                    </span>
                    <h2 id="empty-garage-title">No vehicles yet</h2>
                    <p>Add your first vehicle to start its service history.</p>
                </section>

                <ion-list
                    v-else
                    class="vehicle-list"
                    lines="none"
                    aria-label="Vehicles"
                >
                    <ion-item
                        v-for="vehicle in vehicleStore.vehicles"
                        :key="vehicle.id"
                        button
                        class="vehicle-card"
                        :detail="false"
                        @click="goToVehicle(vehicle.id)"
                    >
                        <span
                            v-if="vehicle.licensePlate"
                            slot="start"
                            class="vehicle-plate"
                            :aria-label="`License plate ${vehicle.licensePlate}`"
                        >
                            <span aria-hidden="true">
                                {{ vehicle.licensePlate }}
                            </span>
                        </span>
                        <span v-else slot="start" class="vehicle-icon">
                            <ion-icon
                                aria-hidden="true"
                                :icon="carSportOutline"
                            />
                        </span>
                        <ion-label>
                            <h2 class="vehicle-name">
                                {{ vehicle.year }} {{ vehicle.make }}
                                {{ vehicle.model }}
                            </h2>
                            <p
                                v-if="
                                    mileageLabel(vehicle) ||
                                    !vehicle.licensePlate
                                "
                                class="vehicle-meta"
                            >
                                <span v-if="mileageLabel(vehicle)">
                                    {{ mileageLabel(vehicle) }}
                                </span>
                                <span v-else>Details not entered</span>
                            </p>
                            <p
                                v-if="maintenanceLabel(vehicle)"
                                class="vehicle-maintenance"
                            >
                                {{ maintenanceLabel(vehicle) }}
                            </p>
                        </ion-label>
                        <ion-icon
                            slot="end"
                            class="vehicle-chevron"
                            aria-hidden="true"
                            :icon="chevronForwardOutline"
                        />
                    </ion-item>
                </ion-list>
            </main>

            <ion-fab slot="fixed" vertical="bottom" horizontal="end">
                <ion-fab-button
                    aria-label="Add vehicle"
                    :disabled="saving"
                    @click="openVehicleModal()"
                >
                    <ion-icon :icon="addOutline" />
                </ion-fab-button>
            </ion-fab>
        </ion-content>
    </ion-page>
</template>

<style scoped>
.garage-page {
    width: min(100%, 46rem);
    margin: 0 auto;
    padding: 1rem var(--cl-page-gutter) 6rem;
}

.vehicle-list {
    margin: 0;
    padding: 0;
    background: transparent;
}

.vehicle-card {
    overflow: hidden;
    margin-bottom: 0.75rem;
    border: 1px solid var(--cl-border);
    border-radius: var(--cl-card-radius);
    background: var(--cl-surface);
    box-shadow: var(--cl-card-shadow);
    --background: var(--cl-surface);
    --background-activated: var(--cl-surface-muted);
    --inner-padding-end: 0.875rem;
    --min-height: 5.5rem;
    --padding-start: 1rem;
}

.garage-error {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 1rem;
    padding: 0.75rem 1rem;
    border: 1px solid var(--cl-danger);
    border-radius: var(--cl-card-radius);
    background: var(--cl-danger-soft);
    color: var(--cl-danger);
}

.garage-error button {
    border: 0;
    background: transparent;
    color: inherit;
    font: inherit;
    font-weight: 700;
}

.vehicle-maintenance {
    color: var(--cl-accent);
    font-weight: 600;
}

.vehicle-icon,
.empty-state-icon {
    display: grid;
    place-items: center;
    background: var(--cl-accent-soft);
    color: var(--cl-accent);
}

.vehicle-icon {
    width: 2.75rem;
    height: 2.75rem;
    margin-inline-end: 0.875rem;
    border-radius: 0.875rem;
    font-size: 1.375rem;
}

.vehicle-plate {
    display: grid;
    width: 4.25rem;
    height: 2.5rem;
    min-width: 4.25rem;
    margin-inline-end: 0.875rem;
    place-items: center;
    padding-inline: 0.375rem;
    overflow: hidden;
    border: 1.5px solid var(--cl-accent);
    border-radius: 0.375rem;
    background: var(--cl-accent-soft);
    color: var(--cl-accent);
    font-family: var(--cl-license-plate-font-family);
    font-size: 0.75rem;
    font-variant-numeric: tabular-nums;
    font-weight: 750;
    letter-spacing: var(--cl-license-plate-letter-spacing);
    line-height: 1;
    text-transform: uppercase;
}

.vehicle-plate span {
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.vehicle-name {
    margin: 0;
    color: var(--cl-text);
    font-size: 1.0625rem;
    font-weight: 700;
    letter-spacing: -0.01em;
}

.vehicle-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem 0.5rem;
    margin: 0.25rem 0 0;
    color: var(--cl-text-muted);
    font-size: 0.875rem;
    font-variant-numeric: tabular-nums;
}

.vehicle-chevron {
    margin-inline-start: 0.5rem;
    color: var(--cl-text-muted);
    font-size: 1.125rem;
}

.empty-state {
    display: grid;
    min-height: 18rem;
    place-items: center;
    align-content: center;
    gap: 0.625rem;
    padding: 2rem;
    border: 1px dashed var(--cl-border);
    border-radius: var(--cl-card-radius);
    background: var(--cl-surface);
    text-align: center;
}

.empty-state-icon {
    width: 3.5rem;
    height: 3.5rem;
    margin-bottom: 0.25rem;
    border-radius: 1rem;
    font-size: 1.75rem;
}

.empty-state h2,
.empty-state p {
    margin: 0;
}

.empty-state h2 {
    font-size: 1.25rem;
}

.empty-state p {
    max-width: 18rem;
    color: var(--cl-text-muted);
    font-size: 0.9375rem;
    line-height: 1.45;
}
</style>
