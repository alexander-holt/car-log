<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button color="medium" @click="cancel">Cancel</ion-button>
      </ion-buttons>
      <ion-title>Add Vehicle</ion-title>
      <ion-buttons slot="end">
        <ion-button @click="confirm" :strong="true" :disabled="!isFormValid"
          >Save</ion-button
        >
      </ion-buttons>
    </ion-toolbar>
  </ion-header>

  <ion-content class="ion-padding">
    <ion-list>
      <ion-item>
        <ion-input
          v-model="vehicleData.make"
          label="Make"
          label-placement="stacked"
          placeholder="e.g. Honda"
        >
        </ion-input>
      </ion-item>

      <ion-item>
        <ion-input
          v-model="vehicleData.model"
          label="Model"
          label-placement="stacked"
          placeholder="e.g. Accord"
        >
        </ion-input>
      </ion-item>

      <ion-item>
        <ion-input
          v-model="vehicleData.year"
          type="number"
          label="Year"
          label-placement="stacked"
          placeholder="e.g. 2026"
        >
        </ion-input>
      </ion-item>
    </ion-list>
  </ion-content>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import {
  modalController,
  IonHeader,
  IonToolbar,
  IonButtons,
  IonButton,
  IonTitle,
  IonContent,
  IonList,
  IonItem,
  IonInput,
} from "@ionic/vue";

// Local state for the form inputs
const vehicleData = ref({
  make: "",
  model: "",
  year: undefined as number | undefined,
});

const isFormValid = computed(() => {
  return (
    vehicleData.value.make.trim() !== "" &&
    vehicleData.value.model.trim() !== "" &&
    vehicleData.value.year !== undefined &&
    vehicleData.value.year > 1885
  );
});

// Dismiss modal without saving
const cancel = () => {
  return modalController.dismiss(null, "cancel");
};

// Send data back to HomePage with a 'confirm' role
const confirm = () => {
  if (!isFormValid) {
    // todo: add an alert here to warn the user
    return;
  }

  const payload = {
    make: vehicleData.value.make,
    model: vehicleData.value.model,
    year: vehicleData.value.year as number,
  };

  return modalController.dismiss(payload, "confirm");
};
</script>
