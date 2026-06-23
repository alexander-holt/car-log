import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { Vehicle } from '../types';

export const useVehicleStore = defineStore('vehicles', () => {
    const vehicles = ref<Vehicle[]>([
        {
            id: '1',
            make: 'Honda',
            model: 'Civic',
            year: 2016,
            vin: "2HGFC2F51GH526306",
            licensePlate: "62ADL8",
            currentMileage: 117000
        }
    ]);

    const addVehicle = (vehicle: Vehicle) => {
        vehicles.value.push(vehicle);
    };

    return { vehicles, addVehicle };
});