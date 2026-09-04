import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import LicensePlateBadge from "@/components/LicensePlateBadge.vue";

describe("LicensePlateBadge", () => {
    it("renders the plate value for surrounding labeled content", () => {
        const wrapper = mount(LicensePlateBadge, {
            props: { licensePlate: "carlog" },
        });

        expect(wrapper.get(".license-plate-badge").text()).toBe("carlog");
        expect(
            wrapper.get(".license-plate-badge").attributes("aria-label"),
        ).toBeUndefined();
        expect(
            wrapper.get(".license-plate-badge span").attributes("aria-hidden"),
        ).toBeUndefined();
    });

    it("uses an explicit accessible label without reading the value twice", () => {
        const wrapper = mount(LicensePlateBadge, {
            props: {
                licensePlate: "CARLOG",
                accessibleLabel: "License plate CARLOG",
            },
        });

        expect(
            wrapper.get(".license-plate-badge").attributes("aria-label"),
        ).toBe("License plate CARLOG");
        expect(
            wrapper.get(".license-plate-badge span").attributes("aria-hidden"),
        ).toBe("true");
    });
});
