import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { modalController, toastController } from "@ionic/vue";
import VehicleFormModal from "@/components/VehicleFormModal.vue";
import VehicleSummary from "@/views/VehicleSummary.vue";
import { useServiceRecordStore } from "@/store/serviceRecordStore";
import { useVehicleStore } from "@/store/vehicleStore";
import { createServiceRecord } from "@/services/serviceRecordRepository";
import type { ServiceRecord } from "@/types";

const routerPush = vi.hoisted(() => vi.fn());

vi.mock("vue-router", () => ({
    useRoute: () => ({ params: { id: "vehicle-1" } }),
    useRouter: () => ({ push: routerPush }),
}));

vi.mock("@/services/serviceRecordRepository", async (importOriginal) => {
    const actual =
        await importOriginal<
            typeof import("@/services/serviceRecordRepository")
        >();
    return {
        ...actual,
        createServiceRecord: vi.fn(),
        loadServiceRecords: vi.fn(),
        updateServiceRecord: vi.fn(),
        deleteServiceRecord: vi.fn(),
    };
});

vi.mock("@ionic/vue", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@ionic/vue")>();
    return { ...actual, onIonViewWillEnter: vi.fn() };
});

const passthrough = { template: "<div><slot /></div>" };
const global = {
    stubs: {
        IonPage: passthrough,
        IonHeader: passthrough,
        IonToolbar: passthrough,
        IonButtons: passthrough,
        IonBackButton: true,
        IonTitle: passthrough,
        IonContent: passthrough,
        IonNote: passthrough,
        IonSpinner: { template: '<span data-testid="spinner" />' },
        IonFab: passthrough,
        IonIcon: true,
        IonButton: {
            emits: ["click"],
            template: "<button @click=\"$emit('click')\"><slot /></button>",
        },
        IonFabButton: {
            props: ["disabled"],
            emits: ["click"],
            template:
                '<button data-testid="add-record" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
        },
        ServiceRecordCard: {
            props: ["record"],
            emits: ["open"],
            template:
                '<button data-testid="record-card" @click="$emit(\'open\', record)" />',
        },
    },
};

const record: ServiceRecord = {
    id: "record-1",
    vehicleId: "vehicle-1",
    date: "2026-08-31",
    mileage: 45_000,
    providerType: "DIY",
    items: [
        {
            id: "item-1",
            serviceRecordId: "record-1",
            serviceType: "INSPECTION",
        },
    ],
};

describe("VehicleSummary", () => {
    beforeEach(() => {
        setActivePinia(createPinia());
        const vehicleStore = useVehicleStore();
        vehicleStore.vehicles = [
            {
                id: "vehicle-1",
                make: "Honda",
                model: "Civic",
                year: 2020,
                currentMileage: 40_000,
            },
        ];
        vi.clearAllMocks();
    });

    it("renders loading, failure, and empty history states", async () => {
        const store = useServiceRecordStore();
        store.loading = true;
        const wrapper = mount(VehicleSummary, { global });

        expect(wrapper.text()).toContain("Loading service history");
        expect(wrapper.find('[data-testid="spinner"]').exists()).toBe(true);

        store.loading = false;
        store.error = "database locked";
        await nextTick();
        expect(wrapper.text()).toContain(
            "Could not load service history. database locked",
        );

        store.error = null;
        await nextTick();
        expect(wrapper.text()).toContain("No service records yet");
    });

    it("saves a record and presents a success toast", async () => {
        vi.mocked(createServiceRecord).mockResolvedValue({});
        const presentModal = vi.fn().mockResolvedValue(undefined);
        const presentToast = vi.fn().mockResolvedValue(undefined);
        vi.spyOn(modalController, "create").mockResolvedValue({
            present: presentModal,
            onWillDismiss: vi
                .fn()
                .mockResolvedValue({ data: record, role: "confirm" }),
        } as never);
        const toastSpy = vi.spyOn(toastController, "create").mockResolvedValue({
            present: presentToast,
        } as never);
        const wrapper = mount(VehicleSummary, { global });

        await wrapper.get('[data-testid="add-record"]').trigger("click");
        await flushPromises();

        expect(presentModal).toHaveBeenCalledOnce();
        expect(createServiceRecord).toHaveBeenCalledWith(record);
        expect(toastSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                message: "Service record saved.",
                color: "primary",
            }),
        );
        expect(presentToast).toHaveBeenCalledOnce();
    });

    it("edits the vehicle from the details toolbar", async () => {
        const updatedVehicle = {
            make: "Honda",
            model: "Accord",
            year: 2021,
            currentMileage: 46_000,
        };
        const vehicleStore = useVehicleStore();
        const updateVehicle = vi
            .spyOn(vehicleStore, "updateVehicle")
            .mockResolvedValue(undefined);
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
        const wrapper = mount(VehicleSummary, { global });

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

    it("opens a service record on its dedicated route", async () => {
        const store = useServiceRecordStore();
        store.records = [record];
        const wrapper = mount(VehicleSummary, { global });

        await wrapper.get('[data-testid="record-card"]').trigger("click");

        expect(routerPush).toHaveBeenCalledWith({
            name: "ServiceRecordDetail",
            params: {
                vehicleId: "vehicle-1",
                recordId: "record-1",
            },
        });
    });
});
