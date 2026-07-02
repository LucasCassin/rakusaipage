import pdvPaymentMethod from "models/pdv_payment_method.js";
import { ValidationError, NotFoundError } from "errors/index.js";
import orchestrator from "tests/orchestrator.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("Model: PdvPaymentMethod", () => {
  describe("create", () => {
    test("should create a payment method", async () => {
      const created = await pdvPaymentMethod.create({ name: "Pix" });
      expect(created.id).toBeDefined();
      expect(created.name).toBe("Pix");
      expect(created.is_active).toBe(true);
    });

    test("should throw ValidationError for a duplicate name", async () => {
      await pdvPaymentMethod.create({ name: "Dinheiro Duplicado" });
      await expect(
        pdvPaymentMethod.create({ name: "Dinheiro Duplicado" }),
      ).rejects.toThrow(ValidationError);
    });
  });

  describe("createVariant", () => {
    test("should create a variant linked to its payment method", async () => {
      const method = await pdvPaymentMethod.create({
        name: "Cartão Crédito Teste",
      });
      const variant = await pdvPaymentMethod.createVariant(method.id, {
        name: "Máquina Amarela",
      });

      expect(variant.payment_method_id).toBe(method.id);
      expect(variant.name).toBe("Máquina Amarela");
    });

    test("should throw NotFoundError for a non-existent payment method", async () => {
      const fakeUUID = "00000000-0000-4000-8000-000000000000";
      await expect(
        pdvPaymentMethod.createVariant(fakeUUID, { name: "Máquina X" }),
      ).rejects.toThrow(NotFoundError);
    });

    test("should not appear grouped under a different payment method", async () => {
      const methodA = await pdvPaymentMethod.create({ name: "Forma A" });
      const methodB = await pdvPaymentMethod.create({ name: "Forma B" });
      await pdvPaymentMethod.createVariant(methodA.id, { name: "Variante A" });

      const foundB = await pdvPaymentMethod.findById(methodB.id);
      expect(foundB.variants.length).toBe(0);
    });
  });

  describe("remove (cascade)", () => {
    test("should deactivate the method and cascade-deactivate its active variants", async () => {
      const method = await pdvPaymentMethod.create({
        name: "Forma Cascata",
      });
      const variant = await pdvPaymentMethod.createVariant(method.id, {
        name: "Variante Cascata",
      });

      await pdvPaymentMethod.remove(method.id);

      const removedMethod = await pdvPaymentMethod.findById(method.id);
      expect(removedMethod.is_active).toBe(false);

      const removedVariant = await pdvPaymentMethod.findVariantById(variant.id);
      expect(removedVariant.is_active).toBe(false);
    });

    test("should be reactivatable via update", async () => {
      const method = await pdvPaymentMethod.create({
        name: "Forma Para Reativar",
      });
      await pdvPaymentMethod.remove(method.id);

      const reactivated = await pdvPaymentMethod.update(method.id, {
        is_active: true,
      });
      expect(reactivated.is_active).toBe(true);
    });
  });

  describe("hardDelete", () => {
    test("should permanently delete a method and its variants", async () => {
      const method = await pdvPaymentMethod.create({
        name: "Forma Para Excluir",
      });
      await pdvPaymentMethod.createVariant(method.id, {
        name: "Variante Para Excluir",
      });

      await pdvPaymentMethod.hardDelete(method.id);

      await expect(pdvPaymentMethod.findById(method.id)).rejects.toThrow(
        NotFoundError,
      );
    });

    test("should throw NotFoundError when deleting a non-existent method", async () => {
      const fakeUUID = "00000000-0000-4000-8000-000000000000";
      await expect(pdvPaymentMethod.hardDelete(fakeUUID)).rejects.toThrow(
        NotFoundError,
      );
    });
  });

  describe("removeVariant (hard delete)", () => {
    test("should permanently delete a variant with no sale history", async () => {
      const method = await pdvPaymentMethod.create({
        name: "Forma Variante Excluir",
      });
      const variant = await pdvPaymentMethod.createVariant(method.id, {
        name: "Variante A Excluir",
      });

      await pdvPaymentMethod.removeVariant(variant.id);

      await expect(
        pdvPaymentMethod.findVariantById(variant.id),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe("findAll", () => {
    test("should hide inactive payment methods by default", async () => {
      const active = await pdvPaymentMethod.create({ name: "Ativa Listagem" });
      const inactive = await pdvPaymentMethod.create({
        name: "Inativa Listagem",
      });
      await pdvPaymentMethod.remove(inactive.id);

      const result = await pdvPaymentMethod.findAll();
      const ids = result.map((pm) => pm.id);

      expect(ids).toContain(active.id);
      expect(ids).not.toContain(inactive.id);
    });

    test("should include inactive when includeInactive is true", async () => {
      const inactive = await pdvPaymentMethod.create({
        name: "Inativa Listagem 2",
      });
      await pdvPaymentMethod.remove(inactive.id);

      const result = await pdvPaymentMethod.findAll({ includeInactive: true });
      const ids = result.map((pm) => pm.id);

      expect(ids).toContain(inactive.id);
    });
  });
});
