import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { modalController, toastController } from "@ionic/vue";
import ServiceRecordFormModal from "@/components/ServiceRecordFormModal.vue";
import type { ServiceRecord } from "@/types";

const passthrough = { template: "<div><slot /></div>" };
const global = {
    stubs: {
        IonHeader: passthrough,
        IonToolbar: passthrough,
        IonTitle: passthrough,
        IonButtons: passthrough,
        IonContent: { template: "<ion-content><slot /></ion-content>" },
        IonList: passthrough,
        IonItem: passthrough,
        IonLabel: passthrough,
        IonNote: passthrough,
        IonSegment: passthrough,
        IonSegmentButton: passthrough,
        IonSelect: passthrough,
        IonSelectOption: passthrough,
        IonTextarea: passthrough,
        IonToggle: passthrough,
        IonIcon: true,
        IonButton: {
            props: ["disabled"],
            emits: ["click"],
            template:
                '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
        },
        IonInput: {
            props: ["label", "modelValue", "placeholder"],
            emits: ["update:modelValue"],
            template:
                '<label>{{ label }}<input :value="modelValue" :placeholder="placeholder" @input="$emit(\'update:modelValue\', $event.target.value)" /><slot /></label>',
        },
    },
};

const editRecord: ServiceRecord = {
    id: "record-1",
    vehicleId: "vehicle-1",
    date: "2026-08-31",
    mileage: 45_000,
    providerType: "SHOP",
    providerName: "Honest Auto",
    items: [
        {
            id: "oil",
            serviceRecordId: "record-1",
            serviceType: "OIL_CHANGE",
            title: "Synthetic service",
            filterReplaced: true,
        },
        {
            id: "inspection",
            serviceRecordId: "record-1",
            serviceType: "INSPECTION",
            title: "Annual inspection",
        },
    ],
};

describe("ServiceRecordFormModal", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("offers every service category and opens newly added services", async () => {
        const wrapper = mount(ServiceRecordFormModal, {
            props: { vehicleId: "vehicle-1", currentMileage: 0 },
            global,
        });

        expect(wrapper.text()).toContain("Oil change");
        expect(wrapper.text()).toContain("Tire rotation");
        expect(wrapper.text()).toContain("Tire replacement");
        expect(wrapper.text()).toContain("Brake service");
        expect(wrapper.text()).toContain("Battery service");
        expect(wrapper.text()).toContain("Inspection");
        expect(wrapper.text()).toContain("Repair");
        expect(wrapper.text()).toContain("Other");
        expect(wrapper.get("form").classes()).toContain("cl-form");
        expect(
            wrapper
                .findAll("input")
                .map((input) => input.attributes("placeholder"))
                .filter(Boolean),
        ).toEqual(
            expect.arrayContaining([
                "e.g. 120000",
                "Optional",
                "0.00",
                "Optional service title",
                "0W-20 full synthetic",
            ]),
        );
        expect(wrapper.findAll(".service-item-panel")).toHaveLength(1);

        const addButton = wrapper
            .findAll("button")
            .find((button) => button.text().includes("Add another service"));
        expect(addButton).toBeDefined();
        await addButton?.trigger("click");

        const summaries = wrapper.findAll(".service-item-summary");
        expect(summaries).toHaveLength(2);
        expect(summaries[0].attributes("aria-expanded")).toBe("false");
        expect(summaries[1].attributes("aria-expanded")).toBe("true");
        expect(wrapper.findAll(".service-item-panel")).toHaveLength(1);
    });

    it("saves a valid DIY record with no provider name", async () => {
        const dismiss = vi
            .spyOn(modalController, "dismiss")
            .mockResolvedValue(true);
        const wrapper = mount(ServiceRecordFormModal, {
            props: { vehicleId: "vehicle-1", currentMileage: 45_000 },
            global,
        });

        expect(wrapper.text()).toContain("DIY");
        expect(wrapper.text()).toContain("Shop");
        expect(wrapper.text()).toContain("Person name");
        expect(wrapper.text()).not.toContain("Person name (optional)");

        const saveButton = wrapper
            .findAll("button")
            .find((button) => button.text().trim() === "Save");
        await saveButton?.trigger("click");
        await flushPromises();

        expect(dismiss).toHaveBeenCalledWith(
            expect.objectContaining({
                providerType: "DIY",
                providerName: undefined,
                items: [expect.objectContaining({ serviceType: "OIL_CHANGE" })],
            }),
            "confirm",
        );
    });

    it("prefills and completes a selected maintenance schedule", async () => {
        const dismiss = vi
            .spyOn(modalController, "dismiss")
            .mockResolvedValue(true);
        const linkedSchedule = {
            id: "schedule-oil",
            vehicleId: "vehicle-1",
            serviceType: "OIL_CHANGE" as const,
            intervalMileage: 5_000,
            nextDueMileage: 50_000,
            enabled: true,
        };
        const wrapper = mount(ServiceRecordFormModal, {
            props: {
                vehicleId: "vehicle-1",
                currentMileage: 50_000,
                schedules: [linkedSchedule],
                schedule: linkedSchedule,
            },
            global,
        });

        expect(wrapper.text()).toContain("Oil change");
        await wrapper
            .findAll("button")
            .find((button) => button.text().trim() === "Save")
            ?.trigger("click");
        await flushPromises();

        expect(dismiss).toHaveBeenCalledWith(
            expect.objectContaining({
                items: [
                    expect.objectContaining({
                        serviceType: "OIL_CHANGE",
                        scheduleId: "schedule-oil",
                    }),
                ],
            }),
            "confirm",
        );
    });

    it("reports an invalid cost alongside other invalid fields", async () => {
        const presentToast = vi.fn().mockResolvedValue(undefined);
        vi.spyOn(toastController, "create").mockResolvedValue({
            present: presentToast,
            dismiss: vi.fn().mockResolvedValue(true),
        } as never);
        const wrapper = mount(ServiceRecordFormModal, {
            props: { vehicleId: "vehicle-1" },
            global,
        });
        const content = wrapper.get("ion-content")
            .element as HTMLIonContentElement;
        const scrollElement = document.createElement("div");
        vi.spyOn(scrollElement, "getBoundingClientRect").mockReturnValue({
            top: 0,
            height: 600,
        } as DOMRect);
        content.getScrollElement = vi.fn().mockResolvedValue(scrollElement);
        content.scrollToPoint = vi.fn().mockResolvedValue(undefined);

        await wrapper.get('input[placeholder="0.00"]').setValue("12.345");
        await wrapper
            .findAll("button")
            .find((button) => button.text().trim() === "Save")
            ?.trigger("click");
        await flushPromises();

        expect(wrapper.get(".validation-summary").text()).toContain(
            "2 fields need attention.",
        );
        expect(wrapper.text()).toContain(
            "Mileage must be a whole number zero or greater.",
        );
        expect(wrapper.text()).toContain(
            "Cost must be zero or greater with at most two decimals.",
        );
        expect(presentToast).toHaveBeenCalledOnce();
    });

    it("keeps one existing service open and removes it with a trash action", async () => {
        const wrapper = mount(ServiceRecordFormModal, {
            props: {
                vehicleId: "vehicle-1",
                currentMileage: 45_000,
                record: editRecord,
            },
            global,
        });
        const summaries = wrapper.findAll(".service-item-summary");

        expect(wrapper.findAll(".service-item-panel")).toHaveLength(0);
        await summaries[0].trigger("click");
        expect(summaries[0].attributes("aria-expanded")).toBe("true");

        await summaries[1].trigger("click");
        expect(summaries[0].attributes("aria-expanded")).toBe("false");
        expect(summaries[1].attributes("aria-expanded")).toBe("true");

        const removeButton = wrapper.get(
            'button[aria-label="Remove inspection"]',
        );
        await removeButton.trigger("click");

        expect(wrapper.findAll(".service-item-card")).toHaveLength(1);
        expect(wrapper.find(".remove-item-button").exists()).toBe(false);
    });

    it("opens the first invalid service and marks every invalid summary", async () => {
        const invalidRecord: ServiceRecord = {
            ...editRecord,
            items: [
                {
                    id: "other-1",
                    serviceRecordId: "record-1",
                    serviceType: "OTHER",
                    title: "",
                },
                {
                    id: "other-2",
                    serviceRecordId: "record-1",
                    serviceType: "OTHER",
                    title: " ",
                },
            ],
        };
        const wrapper = mount(ServiceRecordFormModal, {
            props: {
                vehicleId: "vehicle-1",
                currentMileage: 45_000,
                record: invalidRecord,
            },
            global,
        });
        const content = wrapper.get("ion-content")
            .element as HTMLIonContentElement;
        const scrollElement = document.createElement("div");
        scrollElement.scrollTop = 120;
        vi.spyOn(scrollElement, "getBoundingClientRect").mockReturnValue({
            top: 100,
            height: 600,
        } as DOMRect);
        const boundsSpy = vi
            .spyOn(HTMLElement.prototype, "getBoundingClientRect")
            .mockImplementation(function (this: HTMLElement) {
                if (this.dataset.fieldPath === "items.0.title") {
                    return { top: 350, height: 50 } as DOMRect;
                }
                return { top: 0, height: 0 } as DOMRect;
            });
        content.getScrollElement = vi.fn().mockResolvedValue(scrollElement);
        content.scrollToPoint = vi.fn().mockResolvedValue(undefined);
        const presentToast = vi.fn().mockResolvedValue(undefined);
        const dismissToast = vi.fn().mockResolvedValue(true);
        const createToast = vi
            .spyOn(toastController, "create")
            .mockResolvedValue({
                present: presentToast,
                dismiss: dismissToast,
            } as never);

        const saveButton = wrapper
            .findAll("button")
            .find((button) => button.text().trim() === "Save");
        await saveButton?.trigger("click");
        await flushPromises();

        expect(wrapper.get(".validation-summary").text()).toContain(
            "2 fields need attention. 2 services have errors.",
        );
        expect(
            wrapper
                .findAll(".item-issue-count")
                .map((issue) => issue.text().replace(/\s+/g, " ").trim()),
        ).toEqual(["1 issue", "1 issue"]);
        const summaries = wrapper.findAll(".service-item-summary");
        expect(summaries[0].attributes("aria-expanded")).toBe("true");
        expect(summaries[1].attributes("aria-expanded")).toBe("false");
        expect(wrapper.findAll(".service-item-panel")).toHaveLength(1);
        expect(content.getScrollElement).toHaveBeenCalledOnce();
        expect(content.scrollToPoint).toHaveBeenCalledWith(undefined, 274, 180);
        expect(createToast).toHaveBeenCalledWith(
            expect.objectContaining({
                message:
                    "Record not saved. 2 fields need attention. 2 services have errors.",
                color: "danger",
                position: "bottom",
            }),
        );
        expect(presentToast).toHaveBeenCalledOnce();
        expect(dismissToast).not.toHaveBeenCalled();

        await saveButton?.trigger("click");
        await flushPromises();
        expect(dismissToast).toHaveBeenCalledOnce();
        expect(createToast).toHaveBeenCalledTimes(2);
        expect(presentToast).toHaveBeenCalledTimes(2);

        await wrapper
            .get('[data-field-path="items.0.title"] input')
            .setValue("First custom service");
        expect(wrapper.get(".validation-summary").text()).toContain(
            "1 field needs attention. 1 service has errors.",
        );

        await summaries[1].trigger("click");
        await wrapper
            .get('[data-field-path="items.1.title"] input')
            .setValue("Second custom service");
        expect(wrapper.find(".validation-summary").exists()).toBe(false);

        boundsSpy.mockRestore();
    });
});
