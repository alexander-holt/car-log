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

    it("requires a next due value and its matching repeat interval", async () => {
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
            "Enter a next due mileage, a next due date, or both.",
        );
        expect(dismiss).not.toHaveBeenCalled();

        await wrapper
            .get('input[aria-label="Next due mileage"]')
            .setValue(50_000);
        await flushPromises();
        await wrapper
            .findAll("button")
            .find((button) => button.text() === "Save")
            ?.trigger("click");

        expect(wrapper.text()).toContain(
            "Enter how often this service repeats by mileage.",
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

        await wrapper
            .get('input[aria-label="Next due mileage"]')
            .setValue(50_000);
        await flushPromises();
        await wrapper.get('input[aria-label="Repeat every"]').setValue(5_000);
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
                reminderLeadMileage: undefined,
                enabled: true,
            }),
            "confirm",
        );
    });

    it("keeps warning defaults out of per-schedule overrides", async () => {
        const dismiss = vi
            .spyOn(modalController, "dismiss")
            .mockResolvedValue(true);
        const wrapper = mount(MaintenanceScheduleFormModal, {
            props: { vehicleId: "vehicle-1" },
            global,
        });

        expect(wrapper.text()).toContain("Due soon warning");
        expect(wrapper.text()).toContain(
            "CarLog defaults of 500 miles and 14 days",
        );
        await wrapper
            .get('input[aria-label="Next due date"]')
            .setValue("2027-03-03");
        await flushPromises();
        await wrapper.get('input[aria-label="Repeat every"]').setValue(6);
        await wrapper
            .findAll("button")
            .find((button) => button.text() === "Save")
            ?.trigger("click");

        expect(dismiss).toHaveBeenCalledWith(
            expect.objectContaining({
                intervalMonths: 6,
                nextDueDate: "2027-03-03",
                reminderLeadDays: undefined,
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
        expect(wrapper.text()).not.toContain("Schedule enabled");
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
