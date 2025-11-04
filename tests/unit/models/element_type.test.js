import orchestrator from "tests/orchestrator.js";
import elementType from "models/element_type.js";
import { ValidationError } from "errors/index.js";

describe("Element Type Model", () => {
  beforeAll(async () => {
    await orchestrator.waitForAllServices();
    await orchestrator.clearDatabase();
    await orchestrator.runPendingMigrations();
  });

  describe("create()", () => {
    it("should create a new element type (e.g., Odaiko)", async () => {
      const data = {
        name: "Odaiko",
        image_url: "/icons/odaiko.svg",
      };
      const newType = await elementType.create(data);
      expect(newType.id).toBeDefined();
      expect(newType.name).toBe("Odaiko");
      expect(newType.image_url).toBe("/icons/odaiko.svg");
    });

    it("should fail validation if 'name' is missing", async () => {
      const data = { image_url: "/icons/fail.svg" };
      await expect(elementType.create(data)).rejects.toThrow(ValidationError);
    });

    it("should fail validation if 'image_url' is missing", async () => {
      const data = { name: "Shime" };
      await expect(elementType.create(data)).rejects.toThrow(ValidationError);
    });

    it("should fail if 'name' is not unique", async () => {
      const data = {
        name: "Odaiko", // Já foi criado no primeiro teste
        image_url: "/icons/odaiko2.svg",
      };
      // O banco de dados (Unique constraint) deve rejeitar
      await expect(elementType.create(data)).rejects.toThrow();
    });
  });

  describe("findAll()", () => {
    beforeAll(async () => {
      // Limpa a tabela para garantir a contagem correta
      await orchestrator.clearTable("element_types");

      // Cria alguns tipos
      await elementType.create({
        name: "Shime",
        image_url: "/icons/shime.svg",
      });
      await elementType.create({
        name: "Pessoa",
        image_url: "/icons/pessoa.svg",
      });
    });

    it("should find all element types, ordered by name", async () => {
      const types = await elementType.findAll();

      expect(types).toHaveLength(2);
      expect(types[0].name).toBe("Pessoa"); // "P" vem antes de "S"
      expect(types[1].name).toBe("Shime");
    });
  });
});
