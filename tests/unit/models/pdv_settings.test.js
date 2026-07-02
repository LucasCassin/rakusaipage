import pdvSettings from "models/pdv_settings.js";
import { ValidationError } from "errors/index.js";
import orchestrator from "tests/orchestrator.js";
import database from "infra/database.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("Model: PdvSettings", () => {
  describe("get", () => {
    test("should return the seeded singleton row", async () => {
      const settings = await pdvSettings.get();
      expect(settings.singleton).toBe(true);
      expect(settings.min_cart_value_in_cents).toBe(0);
      expect(settings.max_discount_in_cents).toBeNull();
    });
  });

  describe("update", () => {
    test("should partially update without wiping other fields", async () => {
      await pdvSettings.update({ min_cart_value_in_cents: 500 });
      const afterFirstUpdate = await pdvSettings.get();
      expect(afterFirstUpdate.min_cart_value_in_cents).toBe(500);

      await pdvSettings.update({ max_discount_in_cents: 2000 });
      const afterSecondUpdate = await pdvSettings.get();
      expect(afterSecondUpdate.max_discount_in_cents).toBe(2000);
      // O campo alterado no passo anterior não deve ter sido apagado
      expect(afterSecondUpdate.min_cart_value_in_cents).toBe(500);
    });

    test("should throw ValidationError when update payload is empty", async () => {
      await expect(pdvSettings.update({})).rejects.toThrow(ValidationError);
    });

    test("should never allow a second row to exist", async () => {
      await pdvSettings.update({ min_cart_value_in_cents: 100 });
      const result = await database.query("SELECT count(*) FROM pdv_settings;");
      expect(parseInt(result.rows[0].count)).toBe(1);
    });

    test("should update the percentage discount cap", async () => {
      await pdvSettings.update({ max_discount_percentage: 15 });
      const updated = await pdvSettings.get();
      expect(updated.max_discount_percentage).toBe(15);
    });

    test("should throw ValidationError for a percentage above 100", async () => {
      await expect(
        pdvSettings.update({ max_discount_percentage: 150 }),
      ).rejects.toThrow(ValidationError);
    });
  });
});
