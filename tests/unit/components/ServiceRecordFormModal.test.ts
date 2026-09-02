import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import ServiceRecordFormModal from "@/components/ServiceRecordFormModal.vue";

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
        IonLabel: passthrough,
        IonNote: passthrough,
        IonSegment: passthrough,
        IonSegmentButton: passthrough,
        IonSelect: passthrough,
        IonSelectOption: passthrough,
        IonTextarea: passthrough,
        IonToggle: passthrough,
        IonCard: passthrough,
        IonCardHeader: passthrough,
        IonCardTitle: passthrough,
        IonCardContent: passthrough,
        IonButton: {
            props: ["disabled"],
            emits: ["click"],
            template:
                '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
        },
        IonInput: {
            props: ["label"],
            template: "<label>{{ label }}</label>",
        },
    },
};

describe("ServiceRecordFormModal", () => {
    it("offers every service category and allows several items", async () => {
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

        const addButton = wrapper
            .findAll("button")
            .find((button) => button.text().includes("Add service item"));
        expect(addButton).toBeDefined();
        await addButton?.trigger("click");

        expect(wrapper.text()).toContain("Item 2");
        expect(wrapper.findAll(".service-item-card")).toHaveLength(2);
    });

    it("allows a valid DIY record with no provider name", () => {
        const wrapper = mount(ServiceRecordFormModal, {
            props: { vehicleId: "vehicle-1", currentMileage: 45_000 },
            global,
        });

        expect(wrapper.text()).toContain("DIY");
        expect(wrapper.text()).toContain("Shop");
        expect(wrapper.text()).toContain("Person name (optional)");

        const saveButton = wrapper
            .findAll("button")
            .find((button) => button.text().includes("Save service record"));
        expect(saveButton?.attributes("disabled")).toBeUndefined();
    });
});
