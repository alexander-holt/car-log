import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import {
    actionSheetController,
    alertController,
    modalController,
    onIonViewWillEnter,
    toastController,
} from "@ionic/vue";
import ServiceRecordDetail from "@/views/ServiceRecordDetail.vue";
import {
    deleteServiceRecord,
    loadServiceRecords,
    updateServiceRecord,
} from "@/services/serviceRecordRepository";
import { useServiceRecordStore } from "@/store/serviceRecordStore";
import { useVehicleStore } from "@/store/vehicleStore";
import type { ServiceRecord } from "@/types";

const routerReplace = vi.hoisted(() => vi.fn());

vi.mock("vue-router", () => ({
    useRoute: () => ({
        params: {
            vehicleId: "vehicle-1",
            recordId: "record-1",
        },
    }),
    useRouter: () => ({ replace: routerReplace }),
}));

vi.mock("@/services/serviceRecordRepository", async (importOriginal) => {
    const actual =
        await importOriginal<
            typeof import("@/services/serviceRecordRepository")
        >();
    return {
        ...actual,
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
        IonIcon: true,
        IonButton: {
            props: ["disabled"],
            emits: ["click"],
            template:
                '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
        },
    },
};

const record: ServiceRecord = {
    id: "record-1",
    vehicleId: "vehicle-1",
    date: "2026-08-31",
    mileage: 45_000,
    providerType: "SHOP",
    providerName: "Honest Auto",
    totalCostCents: 20_000,
    notes: "Record notes remain visible in full.",
    items: [
        {
            id: "oil",
            serviceRecordId: "record-1",
            serviceType: "OIL_CHANGE",
            oilType: "0W-20 synthetic",
            filterReplaced: false,
        },
        {
            id: "repair",
            serviceRecordId: "record-1",
            serviceType: "REPAIR",
            title: "Serpentine belt",
            notes: "Replaced cracked belt.",
        },
    ],
};

describe("ServiceRecordDetail", () => {
    beforeEach(() => {
        setActivePinia(createPinia());
        useVehicleStore().vehicles = [
            {
                id: "vehicle-1",
                make: "Honda",
                model: "Civic",
                year: 2020,
                currentMileage: 45_000,
            },
        ];
        useServiceRecordStore().records = [structuredClone(record)];
        vi.clearAllMocks();
    });

    it("shows full notes and uses the service type when an item has no title", () => {
        const wrapper = mount(ServiceRecordDetail, { global });
        const itemHeaders = wrapper.findAll(".service-item-header");

        expect(itemHeaders[0].get("h3").text()).toBe("Oil change");
        expect(itemHeaders[0].find("p").exists()).toBe(false);
        expect(itemHeaders[1].get("h3").text()).toBe("Repair");
        expect(itemHeaders[1].get("p").text()).toBe("Serpentine belt");
        expect(wrapper.text()).toContain(
            "Record notes remain visible in full.",
        );
        expect(wrapper.text()).toContain("0W-20 synthetic");
        expect(wrapper.text()).toContain("Oil filter");
        expect(wrapper.text()).toContain("Not replaced");
        expect(wrapper.text()).toContain("Replaced cracked belt.");
    });

    it("shows loading, failure, and missing-record states", async () => {
        const store = useServiceRecordStore();
        store.records = [];
        store.loading = true;
        const wrapper = mount(ServiceRecordDetail, { global });

        expect(wrapper.text()).toContain("Loading service record");

        store.loading = false;
        store.error = "database locked";
        await nextTick();
        expect(wrapper.text()).toContain(
            "Could not load service record. database locked",
        );

        store.error = null;
        vi.mocked(loadServiceRecords).mockResolvedValue([]);
        const enterView = vi.mocked(onIonViewWillEnter).mock.calls[0][0];
        await enterView();
        await nextTick();

        expect(wrapper.text()).toContain("Service record not found");
    });

    it("edits the record from the detail toolbar", async () => {
        const updatedRecord = {
            ...record,
            providerName: "Updated Auto",
        };
        vi.mocked(updateServiceRecord).mockResolvedValue({});
        const presentModal = vi.fn().mockResolvedValue(undefined);
        vi.spyOn(modalController, "create").mockResolvedValue({
            present: presentModal,
            onWillDismiss: vi
                .fn()
                .mockResolvedValue({ data: updatedRecord, role: "confirm" }),
        } as never);
        const presentToast = vi.fn().mockResolvedValue(undefined);
        vi.spyOn(toastController, "create").mockResolvedValue({
            present: presentToast,
        } as never);
        const wrapper = mount(ServiceRecordDetail, { global });

        await wrapper
            .findAll("button")
            .find((button) => button.text() === "Edit")
            ?.trigger("click");
        await flushPromises();

        expect(presentModal).toHaveBeenCalledOnce();
        expect(updateServiceRecord).toHaveBeenCalledWith(updatedRecord);
        expect(wrapper.text()).toContain("Updated Auto");
        expect(presentToast).toHaveBeenCalledOnce();
    });

    it("confirms deletion and returns to the vehicle history", async () => {
        vi.mocked(deleteServiceRecord).mockResolvedValue(undefined);
        const presentActionSheet = vi.fn().mockResolvedValue(undefined);
        const actionSheetSpy = vi
            .spyOn(actionSheetController, "create")
            .mockResolvedValue({ present: presentActionSheet } as never);
        const presentAlert = vi.fn().mockResolvedValue(undefined);
        const alertSpy = vi
            .spyOn(alertController, "create")
            .mockResolvedValue({ present: presentAlert } as never);
        vi.spyOn(toastController, "create").mockResolvedValue({
            present: vi.fn().mockResolvedValue(undefined),
        } as never);
        const wrapper = mount(ServiceRecordDetail, { global });

        await wrapper
            .get('button[aria-label="More record actions"]')
            .trigger("click");
        await flushPromises();

        const actionOptions = actionSheetSpy.mock.calls[0][0] as {
            buttons: Array<{
                role?: string;
                handler?: () => void;
            }>;
        };
        actionOptions.buttons
            .find((button) => button.role === "destructive")
            ?.handler?.();
        await flushPromises();

        const alertOptions = alertSpy.mock.calls[0][0] as {
            buttons: Array<{
                role?: string;
                handler?: () => void;
            }>;
        };
        alertOptions.buttons
            .find((button) => button.role === "destructive")
            ?.handler?.();
        await flushPromises();

        expect(deleteServiceRecord).toHaveBeenCalledWith("record-1");
        expect(routerReplace).toHaveBeenCalledWith("/vehicle/vehicle-1");
    });
});
