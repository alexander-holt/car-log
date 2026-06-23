<template>
    <ion-page>
        <ion-header :translucent="true">
            <ion-toolbar>
                <ion-title>My Garage</ion-title>
            </ion-toolbar>
        </ion-header>

        <ion-content :fullscreen="true" id="main-content">
            <ion-header collapse="condense">
                <ion-toolbar>
                    <ion-title size="large">My Garage</ion-title>
                </ion-toolbar>
            </ion-header>

            <div v-if="vehicleStore.vehicles.length === 0" class="empty-state">
                <p>Your garage is empty.</p>
                <p>Tap the + button to add a vehicle.</p>
            </div>

            <ion-list v-else>
                <ion-item
                    v-for="car in vehicleStore.vehicles"
                    :key="car.id"
                    @click="goToVehicle(car.id)"
                    button
                >
                    <ion-label>
                        <h2>{{ car.year }} {{ car.make }} {{ car.model }}</h2>
                        <p>Plate: {{ car.licensePlate }}</p>
                        <p>Mileage: {{ car.currentMileage }}</p>
                    </ion-label>
                </ion-item>
            </ion-list>

            <ion-fab slot="fixed" vertical="bottom" horizontal="end">
                <ion-fab-button @click="openAddVehicleModal">
                    <ion-icon :icon="add"></ion-icon>
                </ion-fab-button>
            </ion-fab>
        </ion-content>
    </ion-page>
</template>

<script setup lang="ts">
import {
    IonContent,
    IonHeader,
    IonPage,
    IonTitle,
    IonToolbar,
    IonList,
    IonItem,
    IonLabel,
    IonFab,
    IonFabButton,
    IonIcon,
    modalController,
} from "@ionic/vue";
import { add } from "ionicons/icons";
import { useVehicleStore } from "@/store/vehicleStore";
import { useRouter } from "vue-router";
import { v4 as uuidv4 } from "uuid";
import AddVehicleModal from "@/components/AddVehicleModal.vue";

const router = useRouter();
const vehicleStore = useVehicleStore();

const goToVehicle = (id: string) => {
    router.push(`/vehicle/${id}`);
};

const openAddVehicleModal = async () => {
    const modal = await modalController.create({
        component: AddVehicleModal,
        presentingElement: document.getElementById("main-content") || undefined,
    });

    await modal.present();

    const { data, role } = await modal.onWillDismiss();

    if (role === "confirm" && data) {
        const newVehicle = {
            id: uuidv4(),
            make: data.make,
            model: data.model,
            year: data.year,
            licensePlate: "n/a",
            curentMileage: 0,
        };

        vehicleStore.addVehicle(newVehicle);
    }
};
</script>

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
