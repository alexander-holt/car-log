import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { modalController, toastController } from "@ionic/vue";
import VehicleFormModal from "@/components/VehicleFormModal.vue";
import type { Vehicle } from "@/types";

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
        IonNote: passthrough,
        IonIcon: true,
        IonButton: {
            emits: ["click"],
            template: "<button @click=\"$emit('click')\"><slot /></button>",
        },
        IonInput: {
            props: ["label", "modelValue", "placeholder"],
            emits: ["update:modelValue"],
            template:
                '<label>{{ label }}<input :value="modelValue" :placeholder="placeholder" @input="$emit(\'update:modelValue\', $event.target.value)" /><slot /></label>',
        },
    },
};

const vehicle: Vehicle = {
    id: "vehicle-1",
    make: "Honda",
    model: "Civic",
    year: 2020,
    currentMileage: 45_000,
    licensePlate: "CARLOG",
};

describe("VehicleFormModal", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("uses the grouped edit form and returns a normalized vehicle", async () => {
        const dismiss = vi
            .spyOn(modalController, "dismiss")
            .mockResolvedValue(true);
        const wrapper = mount(VehicleFormModal, {
            props: { vehicle },
            global,
        });

        expect(wrapper.text()).toContain("Edit vehicle");
        expect(wrapper.text()).toContain("Vehicle");
        expect(wrapper.text()).toContain("Details");
        expect(wrapper.get("form").classes()).toContain("cl-form");
        expect(
            wrapper.get('input[placeholder="17-character VIN"]').element,
        ).toBe(wrapper.get('[data-field-path="vin"] input').element);
        expect(wrapper.find(".validation-summary").exists()).toBe(false);

        const saveButton = wrapper
            .findAll("button")
            .find((button) => button.text().trim() === "Save");
        await saveButton?.trigger("click");
        await flushPromises();

        expect(dismiss).toHaveBeenCalledWith(
            expect.objectContaining({
                make: "Honda",
                model: "Civic",
                year: 2020,
                currentMileage: 45_000,
                licensePlate: "CARLOG",
            }),
            "confirm",
        );
    });

    it("shows save feedback and refreshes validation as fields are fixed", async () => {
        const wrapper = mount(VehicleFormModal, { global });
        const content = wrapper.get("ion-content")
            .element as HTMLIonContentElement;
        const scrollElement = document.createElement("div");
        vi.spyOn(scrollElement, "getBoundingClientRect").mockReturnValue({
            top: 100,
            height: 500,
        } as DOMRect);
        const boundsSpy = vi
            .spyOn(HTMLElement.prototype, "getBoundingClientRect")
            .mockImplementation(function (this: HTMLElement) {
                if (this.dataset.fieldPath === "make") {
                    return { top: 200, height: 50 } as DOMRect;
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
        const dismissModal = vi
            .spyOn(modalController, "dismiss")
            .mockResolvedValue(true);

        const saveButton = wrapper
            .findAll("button")
            .find((button) => button.text().trim() === "Save");
        await saveButton?.trigger("click");
        await flushPromises();

        expect(wrapper.get(".validation-summary").text()).toContain(
            "2 fields need attention.",
        );
        expect(content.scrollToPoint).toHaveBeenCalledWith(undefined, 10, 180);
        expect(createToast).toHaveBeenCalledWith(
            expect.objectContaining({
                message: "Vehicle not saved. 2 fields need attention.",
                color: "danger",
            }),
        );
        expect(presentToast).toHaveBeenCalledOnce();
        expect(dismissModal).not.toHaveBeenCalled();

        await wrapper.get('[data-field-path="make"] input').setValue("Honda");
        expect(wrapper.get(".validation-summary").text()).toContain(
            "1 field needs attention.",
        );
        await wrapper.get('[data-field-path="model"] input').setValue("Civic");
        expect(wrapper.find(".validation-summary").exists()).toBe(false);

        await saveButton?.trigger("click");
        await flushPromises();
        expect(dismissToast).toHaveBeenCalledOnce();
        expect(dismissModal).toHaveBeenCalledWith(
            expect.objectContaining({
                make: "Honda",
                model: "Civic",
            }),
            "confirm",
        );

        boundsSpy.mockRestore();
    });
});
