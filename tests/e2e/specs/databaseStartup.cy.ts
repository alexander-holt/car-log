describe("browser database startup", () => {
    it("opens the SQLite web store and mounts the application", () => {
        cy.visit("/");

        cy.get("jeep-sqlite").should("exist");
        cy.contains("CarLog couldn't start").should("not.exist");
        cy.contains("My Garage").should("exist");
    });
});
