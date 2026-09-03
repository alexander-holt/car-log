import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { modalController } from "@ionic/vue";
import MaintenanceScheduleFormModal from "@/components/MaintenanceScheduleFormModal.vue";

const passthrough = { template: "<div><slot /></div>" };
const global = {
    stubs: {
        IonHeader: passthrough,
        IonToolbar: passthrough,
        IonTitle: passthrough,
        IonButtons: passthrough,
        IonContent: passthrough,
        IonList: passthrough,
        IonItem: passthrough,
        IonNote: passthrough,
        IonSelect: passthrough,
        IonSelectOption: passthrough,
        IonToggle: passthrough,
        IonButton: {
            emits: ["click"],
            template: "<button @click=\"$emit('click')\"><slot /></button>",
        },
        IonInput: {
            props: ["label", "modelValue", "placeholder"],
            emits: ["update:modelValue"],
            template:
                '<label>{{ label }}<input :aria-label="label" :value="modelValue" :placeholder="placeholder" @input="$emit(\'update:modelValue\', $event.target.value)" /><slot /></label>',
        },
    },
};

describe("MaintenanceScheduleFormModal", () => {
    afterEach(() => vi.restoreAllMocks());

    it("shows an error until a mileage or time interval is complete", async () => {
        const dismiss = vi
            .spyOn(modalController, "dismiss")
            .mockResolvedValue(true);
        const wrapper = mount(MaintenanceScheduleFormModal, {
            props: { vehicleId: "vehicle-1" },
            global,
        });

        await wrapper
            .findAll("button")
            .find((button) => button.text() === "Save")
            ?.trigger("click");

        expect(wrapper.text()).toContain("Schedule not saved.");
        expect(wrapper.text()).toContain(
            "Enter a mileage interval, a time interval, or both.",
        );
        expect(dismiss).not.toHaveBeenCalled();
    });

    it("creates a mileage schedule", async () => {
        const dismiss = vi
            .spyOn(modalController, "dismiss")
            .mockResolvedValue(true);
        const wrapper = mount(MaintenanceScheduleFormModal, {
            props: { vehicleId: "vehicle-1" },
            global,
        });

        await wrapper.get('input[aria-label="Every"]').setValue(5_000);
        await wrapper
            .get('input[aria-label="Next due mileage"]')
            .setValue(50_000);
        await wrapper
            .findAll("button")
            .find((button) => button.text() === "Save")
            ?.trigger("click");
        await flushPromises();

        expect(dismiss).toHaveBeenCalledWith(
            expect.objectContaining({
                id: expect.any(String),
                vehicleId: "vehicle-1",
                serviceType: "OIL_CHANGE",
                intervalMileage: 5_000,
                nextDueMileage: 50_000,
                enabled: true,
            }),
            "confirm",
        );
    });

    it("edits and disables an existing combined schedule", async () => {
        const dismiss = vi
            .spyOn(modalController, "dismiss")
            .mockResolvedValue(true);
        const wrapper = mount(MaintenanceScheduleFormModal, {
            props: {
                vehicleId: "vehicle-1",
                schedule: {
                    id: "schedule-1",
                    vehicleId: "vehicle-1",
                    serviceType: "INSPECTION",
                    intervalMileage: 10_000,
                    intervalMonths: 12,
                    nextDueMileage: 60_000,
                    nextDueDate: "2027-09-03",
                    reminderLeadMileage: 1_000,
                    reminderLeadDays: 30,
                    enabled: false,
                },
            },
            global,
        });

        expect(wrapper.text()).toContain("Edit schedule");
        await wrapper
            .findAll("button")
            .find((button) => button.text() === "Save")
            ?.trigger("click");
        await flushPromises();

        expect(dismiss).toHaveBeenCalledWith(
            expect.objectContaining({
                id: "schedule-1",
                intervalMileage: 10_000,
                intervalMonths: 12,
                nextDueMileage: 60_000,
                nextDueDate: "2027-09-03",
                enabled: false,
            }),
            "confirm",
        );
    });
});
