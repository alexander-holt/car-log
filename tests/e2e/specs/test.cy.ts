describe("CarLog root route", () => {
    it("redirects to My Garage", () => {
        cy.visit("/");

        cy.location("pathname").should("eq", "/home");
        cy.contains("ion-title", "My Garage").should("exist");
        cy.contains("Ready to create an app?").should("not.exist");
    });
});
