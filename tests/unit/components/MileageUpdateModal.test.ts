import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { modalController } from "@ionic/vue";
import MileageUpdateModal from "@/components/MileageUpdateModal.vue";

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
        IonButton: {
            emits: ["click"],
            template: "<button @click=\"$emit('click')\"><slot /></button>",
        },
        IonInput: {
            props: ["label", "modelValue", "disabled"],
            emits: ["update:modelValue"],
            template:
                '<label>{{ label }}<input :aria-label="label" :disabled="disabled" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" /><slot /></label>',
        },
        IonCheckbox: {
            props: ["modelValue"],
            emits: ["update:modelValue"],
            template:
                '<label><input aria-label="Confirm odometer correction" type="checkbox" :checked="modelValue" @change="$emit(\'update:modelValue\', $event.target.checked)" /><slot /></label>',
        },
        IonToggle: {
            props: ["modelValue"],
            emits: ["update:modelValue"],
            template:
                '<label><input type="checkbox" :checked="modelValue" @change="$emit(\'update:modelValue\', $event.target.checked)" /><slot /></label>',
        },
    },
};

describe("MileageUpdateModal", () => {
    afterEach(() => vi.restoreAllMocks());

    it("saves a fast mileage update with reminder preferences", async () => {
        const dismiss = vi
            .spyOn(modalController, "dismiss")
            .mockResolvedValue(true);
        const wrapper = mount(MileageUpdateModal, {
            props: {
                vehicle: {
                    id: "vehicle-1",
                    make: "Honda",
                    model: "Civic",
                    year: 2020,
                    currentMileage: 45_000,
                    mileageReminderIntervalDays: 30,
                    mileageRemindersEnabled: true,
                },
            },
            global,
        });

        expect(wrapper.text()).toContain(
            "When parked, enter the current odometer reading.",
        );
        await wrapper
            .get('input[aria-label="Current mileage *"]')
            .setValue(45_250);
        await wrapper
            .findAll("button")
            .find((button) => button.text() === "Save")
            ?.trigger("click");
        await flushPromises();

        expect(dismiss).toHaveBeenCalledWith(
            {
                mileage: 45_250,
                allowCorrection: false,
                mileageReminderIntervalDays: 30,
                mileageRemindersEnabled: true,
            },
            "confirm",
        );
    });

    it("requires explicit confirmation for a lower reading", async () => {
        const dismiss = vi
            .spyOn(modalController, "dismiss")
            .mockResolvedValue(true);
        const wrapper = mount(MileageUpdateModal, {
            props: {
                vehicle: {
                    id: "vehicle-1",
                    make: "Honda",
                    model: "Civic",
                    year: 2020,
                    currentMileage: 45_000,
                },
            },
            global,
        });

        await wrapper
            .get('input[aria-label="Current mileage *"]')
            .setValue(44_000);
        const save = wrapper
            .findAll("button")
            .find((button) => button.text() === "Save");
        await save?.trigger("click");

        expect(wrapper.text()).toContain(
            "Confirm that this lower mileage is an odometer correction.",
        );
        expect(dismiss).not.toHaveBeenCalled();

        await wrapper
            .get('input[aria-label="Confirm odometer correction"]')
            .setValue(true);
        await save?.trigger("click");
        await flushPromises();

        expect(dismiss).toHaveBeenCalledWith(
            expect.objectContaining({ mileage: 44_000, allowCorrection: true }),
            "confirm",
        );
    });
});
