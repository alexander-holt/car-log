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
        IonItemSliding: passthrough,
        IonItemOptions: passthrough,
        IonLabel: passthrough,
        IonIcon: true,
        IonFab: passthrough,
        IonItem: {
            emits: ["click"],
            template: "<button @click=\"$emit('click')\"><slot /></button>",
        },
        IonItemOption: {
            props: ["disabled"],
            emits: ["click"],
            template:
                '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
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
        expect(wrapper.text()).toContain("Plate CARLOG");

        await wrapper.get(".vehicle-card").trigger("click");

        expect(routerPush).toHaveBeenCalledWith("/vehicle/vehicle-1");
    });

    it("keeps swipe editing and confirms the saved update", async () => {
        const vehicleStore = useVehicleStore();
        const updateVehicle = vi
            .spyOn(vehicleStore, "updateVehicle")
            .mockResolvedValue(undefined);
        const updatedVehicle = {
            make: "Honda",
            model: "Civic Si",
            year: 2020,
            currentMileage: 46_000,
        };
        const presentModal = vi.fn().mockResolvedValue(undefined);
        const createModal = vi
            .spyOn(modalController, "create")
            .mockResolvedValue({
                present: presentModal,
                onWillDismiss: vi.fn().mockResolvedValue({
                    data: updatedVehicle,
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

        const editButton = wrapper
            .findAll("button")
            .find((button) => button.text().trim() === "Edit");
        await editButton?.trigger("click");
        await flushPromises();

        expect(createModal).toHaveBeenCalledWith(
            expect.objectContaining({
                component: VehicleFormModal,
                componentProps: {
                    vehicle: expect.objectContaining({ id: "vehicle-1" }),
                },
            }),
        );
        expect(presentModal).toHaveBeenCalledOnce();
        expect(updateVehicle).toHaveBeenCalledWith("vehicle-1", updatedVehicle);
        expect(createToast).toHaveBeenCalledWith(
            expect.objectContaining({
                message: "Vehicle updated.",
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
