import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { modalController, toastController } from "@ionic/vue";
import HomePage from "@/views/HomePage.vue";
import VehicleFormModal from "@/components/VehicleFormModal.vue";
import { useVehicleStore } from "@/store/vehicleStore";

const routerPush = vi.hoisted(() => vi.fn());

vi.mock("vue-router", () => ({
    useRouter: () => ({ push: routerPush }),
}));

const passthrough = { template: "<div><slot /></div>" };
const global = {
    stubs: {
        IonPage: passthrough,
        IonHeader: passthrough,
        IonToolbar: passthrough,
        IonTitle: passthrough,
        IonContent: passthrough,
        IonList: passthrough,
        IonLabel: passthrough,
        IonIcon: true,
        IonFab: passthrough,
        IonItem: {
            emits: ["click"],
            template: "<button @click=\"$emit('click')\"><slot /></button>",
        },
        IonFabButton: {
            props: ["disabled"],
            emits: ["click"],
            template:
                '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
        },
    },
};

describe("HomePage", () => {
    beforeEach(() => {
        setActivePinia(createPinia());
        useVehicleStore().vehicles = [
            {
                id: "vehicle-1",
                make: "Honda",
                model: "Civic",
                year: 2020,
                currentMileage: 45_000,
                licensePlate: "CARLOG",
            },
        ];
        routerPush.mockReset();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("renders a compact vehicle card and opens its details", async () => {
        const wrapper = mount(HomePage, { global });

        expect(wrapper.text()).toContain("2020 Honda Civic");
        expect(wrapper.text()).toContain("45,000 mi");
        expect(wrapper.get(".vehicle-plate").text()).toBe("CARLOG");
        expect(wrapper.get(".vehicle-plate").attributes("aria-label")).toBe(
            "License plate CARLOG",
        );
        expect(wrapper.get(".vehicle-meta").text()).toBe("45,000 mi");
        expect(wrapper.text()).not.toContain("Plate CARLOG");

        await wrapper.get(".vehicle-card").trigger("click");

        expect(routerPush).toHaveBeenCalledWith("/vehicle/vehicle-1");
    });

    it("uses the vehicle icon when no license plate is saved", () => {
        useVehicleStore().vehicles[0].licensePlate = undefined;

        const wrapper = mount(HomePage, { global });

        expect(wrapper.find(".vehicle-plate").exists()).toBe(false);
        expect(wrapper.find(".vehicle-icon").exists()).toBe(true);
        expect(wrapper.get(".vehicle-meta").text()).toBe("45,000 mi");
    });

    it("adds a vehicle from the garage action", async () => {
        const vehicleStore = useVehicleStore();
        const addVehicle = vi
            .spyOn(vehicleStore, "addVehicle")
            .mockResolvedValue(undefined);
        const newVehicle = {
            make: "Mazda",
            model: "MX-5",
            year: 2024,
            currentMileage: 1_500,
        };
        const presentModal = vi.fn().mockResolvedValue(undefined);
        const createModal = vi
            .spyOn(modalController, "create")
            .mockResolvedValue({
                present: presentModal,
                onWillDismiss: vi.fn().mockResolvedValue({
                    data: newVehicle,
                    role: "confirm",
                }),
            } as never);
        const presentToast = vi.fn().mockResolvedValue(undefined);
        const createToast = vi
            .spyOn(toastController, "create")
            .mockResolvedValue({
                present: presentToast,
            } as never);
        const wrapper = mount(HomePage, { global });

        await wrapper.get('button[aria-label="Add vehicle"]').trigger("click");
        await flushPromises();

        expect(createModal).toHaveBeenCalledWith(
            expect.objectContaining({
                component: VehicleFormModal,
            }),
        );
        expect(presentModal).toHaveBeenCalledOnce();
        expect(addVehicle).toHaveBeenCalledWith({
            id: expect.any(String),
            ...newVehicle,
        });
        expect(createToast).toHaveBeenCalledWith(
            expect.objectContaining({
                message: "Vehicle added.",
                color: "primary",
            }),
        );
        expect(presentToast).toHaveBeenCalledOnce();
    });

    it("shows the designed empty state when no vehicles exist", () => {
        useVehicleStore().vehicles = [];
        const wrapper = mount(HomePage, { global });

        expect(wrapper.get(".empty-state").text()).toContain("No vehicles yet");
        expect(wrapper.text()).toContain(
            "Add your first vehicle to start its service history.",
        );
    });
});
