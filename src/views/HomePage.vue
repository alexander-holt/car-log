<script setup lang="ts">
import {
    IonContent,
    IonHeader,
    IonPage,
    IonTitle,
    IonToolbar,
    IonList,
    IonItem,
    IonItemOptions,
    IonItemOption,
    IonItemSliding,
    IonLabel,
    IonFab,
    IonFabButton,
    IonIcon,
    modalController,
    alertController,
} from "@ionic/vue";
import { add } from "ionicons/icons";
import { useVehicleStore } from "@/store/vehicleStore";
import { useRouter } from "vue-router";
import { v4 as uuidv4 } from "uuid";
import { Vehicle } from "@/types";
import VehicleFormModal from "@/components/VehicleFormModal.vue";
import { ref } from "vue";

const router = useRouter();
const vehicleStore = useVehicleStore();

const vehicleListRef = ref<(typeof IonList & { $el: any }) | null>(null);

const goToVehicle = (id: string) => {
    router.push(`/vehicle/${id}`);
};

const openVehicleModal = async (existingVehicle?: Vehicle) => {
    await vehicleListRef.value?.$el?.closeSlidingItems();

    const modal = await modalController.create({
        component: VehicleFormModal,
        presentingElement: document.getElementById("main-content") || undefined,
        componentProps: {
            vehicle: existingVehicle,
        },
    });

    await modal.present();

    const { data, role } = await modal.onWillDismiss();

    if (role === "confirm" && data) {
        if (existingVehicle) {
            await vehicleStore.updateVehicle(existingVehicle.id, data);
        } else {
            const newVehicle: Vehicle = {
                id: uuidv4(),
                ...data,
            };
            await vehicleStore.addVehicle(newVehicle);
        }
    }
};

const confirmDelete = async (id: string) => {
    await vehicleListRef.value?.$el?.closeSlidingItems();

    const alert = await alertController.create({
        header: "Delete Vehicle",
        message:
            "Are you sure you want to delete this vehicle? This action cannot be undone.",
        buttons: [
            {
                text: "Cancel",
                role: "cancel",
            },
            {
                text: "Delete",
                role: "destructive",
                handler: async () => {
                    await vehicleStore.deleteVehicle(id);
                },
            },
        ],
    });

    await alert.present();
};
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

            <div v-if="vehicleStore.vehicles.length === 0" class="empty-state">
                <p>Your garage is empty.</p>
                <p>Tap the + button to add a vehicle.</p>
            </div>

            <ion-list ref="vehicleListRef">
                <ion-item-sliding
                    v-for="vehicle in vehicleStore.vehicles"
                    :key="vehicle.id"
                >
                    <ion-item button @click="goToVehicle(vehicle.id)">
                        <ion-label>
                            <h2>
                                {{ vehicle.year }} {{ vehicle.make }}
                                {{ vehicle.model }}
                            </h2>
                            <p>Plate: {{ vehicle.licensePlate }}</p>
                        </ion-label>
                    </ion-item>

                    <ion-item-options side="end">
                        <ion-item-option
                            color="primary"
                            @click="openVehicleModal(vehicle)"
                        >
                            Edit
                        </ion-item-option>
                        <ion-item-option
                            color="danger"
                            @click="confirmDelete(vehicle.id)"
                        >
                            Delete
                        </ion-item-option>
                    </ion-item-options>
                </ion-item-sliding>
            </ion-list>

            <ion-fab slot="fixed" vertical="bottom" horizontal="end">
                <ion-fab-button @click="openVehicleModal()">
                    <ion-icon :icon="add"></ion-icon>
                </ion-fab-button>
            </ion-fab>
        </ion-content>
    </ion-page>
</template>

<style scoped>
.empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 60%;
    color: #8c8c8c;
    text-align: center;
}

.empty-state p {
    margin: 5px 0;
}
</style>
