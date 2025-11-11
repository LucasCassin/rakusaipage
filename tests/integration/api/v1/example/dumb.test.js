describe("Dumb Test Example", () => {
  describe("Anonymous User", () => {
    beforeAll(async () => {
      await orchestrator.waitForAllServices();
      await orchestrator.clearDatabase();
    });

    test("should pass a basic equality check", () => {
      expect(1).toBe(1);
    });
  });
});
