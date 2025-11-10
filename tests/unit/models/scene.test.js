import scene from "models/scene.js";
import database from "infra/database.js";
import validator from "models/validator.js";
import { NotFoundError } from "errors/index.js";

// Mock do banco de dados
jest.mock("infra/database.js");
// Mock do validador
jest.mock("models/validator.js");

describe("Unit Tests for Scene Model", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    validator.mockImplementation((data, schema) => data);
  });

  // --- (Sem alterações) ---
  describe("create", () => {
    it("should create a new scene", async () => {
      const sceneData = {
        presentation_id: "uuid-pres",
        order: 1,
        name: "Nova Cena",
        scene_type: "FORMATION",
        description: "Desc",
      };
      const mockReturn = { ...sceneData, id: "uuid-scene" };
      database.query.mockResolvedValue({ rows: [mockReturn], rowCount: 1 });

      const result = await scene.create(sceneData);

      expect(database.query).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockReturn);
    });
  });

  // --- (Sem alterações) ---
  describe("update", () => {
    it("should update an existing scene", async () => {
      const sceneId = "uuid-scene";
      const updateData = { name: "Nome Atualizado" };
      const mockReturn = { id: sceneId, name: "Nome Atualizado" };
      database.query.mockResolvedValue({ rows: [mockReturn], rowCount: 1 });

      const result = await scene.update(sceneId, updateData);

      expect(database.query).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockReturn);
    });

    it("should throw NotFoundError if scene not found", async () => {
      database.query.mockResolvedValue({ rows: [], rowCount: 0 });
      await expect(
        scene.update("uuid-nao-existe", { name: "Teste" }),
      ).rejects.toThrow(NotFoundError);
    });
  });

  // --- (Sem alterações) ---
  describe("del", () => {
    it("should delete a scene", async () => {
      const sceneId = "uuid-scene";
      const mockReturn = { id: sceneId };
      database.query.mockResolvedValue({ rows: [mockReturn], rowCount: 1 });

      const result = await scene.del(sceneId);

      expect(database.query).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockReturn);
    });

    it("should throw NotFoundError if scene not found", async () => {
      database.query.mockResolvedValue({ rows: [], rowCount: 0 });
      await expect(scene.del("uuid-nao-existe")).rejects.toThrow(NotFoundError);
    });
  });

  // --- (Refatorado) ---
  describe("findAllFromPresentation", () => {
    it("should fetch details for FORMATION scenes (elements) using the correct JOIN", async () => {
      const presentationId = "uuid-presentation";
      const sceneFormationId = "uuid-scene-formation";
      const sceneTransitionId = "uuid-scene-transition";

      const scenesData = [
        { id: sceneFormationId, scene_type: "FORMATION" },
        { id: sceneTransitionId, scene_type: "TRANSITION" },
      ];
      const elementsData = [
        {
          id: "uuid-element",
          display_name: "Elemento com JOIN",
          assigned_user_id: "uuid-user",
        },
      ];
      const stepsData = [{ id: "uuid-step" }];

      // Configuração do Mock
      database.query.mockImplementation((query) => {
        // 1. Mock da busca de Cenas
        if (query.text.includes("SELECT * FROM scenes WHERE")) {
          return Promise.resolve({ rows: scenesData, rowCount: 2 });
        }

        // 2. Foco da Correção: Mock da busca de Elementos (com JOIN)
        // Mais robusto: checa se a query menciona AMBAS as tabelas.
        if (
          query.text.includes("scene_elements") &&
          query.text.includes("element_groups") &&
          query.values.includes(sceneFormationId)
        ) {
          return Promise.resolve({ rows: elementsData, rowCount: 1 });
        }

        // 3. Mock da busca de Passos
        if (
          query.text.includes("SELECT * FROM transition_steps WHERE") &&
          query.values.includes(sceneTransitionId)
        ) {
          return Promise.resolve({ rows: stepsData, rowCount: 1 });
        }
        return Promise.resolve({ rows: [], rowCount: 0 });
      });

      const result = await scene.findAllFromPresentation(presentationId);

      // Validar o resultado
      expect(result).toHaveLength(2);
      expect(result[0].elements).toHaveLength(1); // Este deve passar agora
      expect(result[0].elements[0].display_name).toBe("Elemento com JOIN");
      expect(result[1].steps).toHaveLength(1);
    });

    it("should return empty arrays if scene type has no data", async () => {
      // (Seu teste original de "empty array")
      const presentationId = "uuid-presentation";
      const sceneFormationId = "uuid-scene-formation";
      const scenesData = [{ id: sceneFormationId, scene_type: "FORMATION" }];

      database.query.mockImplementation((query) => {
        if (query.text.includes("SELECT * FROM scenes WHERE")) {
          return Promise.resolve({ rows: scenesData, rowCount: 1 });
        }
        return Promise.resolve({ rows: [], rowCount: 0 });
      });

      const result = await scene.findAllFromPresentation(presentationId);

      expect(result).toHaveLength(1);
      expect(result[0].elements).toHaveLength(0);
      expect(result[0].steps).toHaveLength(0);
    });
  });
});
