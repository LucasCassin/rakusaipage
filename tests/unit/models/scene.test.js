import orchestrator from "tests/orchestrator.js";
import presentation from "models/presentation.js";
import scene from "models/scene.js";
import user from "models/user.js";
import { ValidationError, NotFoundError } from "errors/index.js";

describe("Scene Model", () => {
  let adminUser, testPresentation;

  beforeAll(async () => {
    await orchestrator.waitForAllServices();
    await orchestrator.clearDatabase();
    await orchestrator.runPendingMigrations();

    adminUser = await user.findOneUser({ username: "mainUser" });
    testPresentation = await presentation.create(
      { name: "Show de Cenas" },
      adminUser.id,
    );
  });

  describe("create()", () => {
    it("should create a new scene (FORMATION)", async () => {
      const data = {
        presentation_id: testPresentation.id,
        name: "Música 1 (Hajime)",
        scene_type: "FORMATION",
        order: 1,
        description: "Início do show",
      };
      const newScene = await scene.create(data);

      expect(newScene.id).toBeDefined();
      expect(newScene.name).toBe("Música 1 (Hajime)");
      // --- CORREÇÃO AQUI ---
      expect(newScene.scene_type).toBe("FORMATION"); // A coluna do DB é "scene_type"
      // --- FIM DA CORREÇÃO ---
      expect(newScene.order).toBe(1);
    });

    it("should create a new scene (TRANSITION)", async () => {
      const data = {
        presentation_id: testPresentation.id,
        name: "Troca para Jousui",
        scene_type: "TRANSITION",
        order: 2,
      };
      const newScene = await scene.create(data);

      // --- CORREÇÃO AQUI ---
      expect(newScene.scene_type).toBe("TRANSITION");
      // --- FIM DA CORREÇÃO ---
      expect(newScene.description).toBeNull();
    });

    it("should fail with ValidationError if 'scene_type' is invalid", async () => {
      const data = {
        presentation_id: testPresentation.id,
        name: "Cena Inválida",
        scene_type: "INVALID_TYPE",
        order: 3,
      };
      await expect(scene.create(data)).rejects.toThrow(ValidationError);
    });

    it("should fail with ValidationError if 'presentation_id' is missing", async () => {
      const data = {
        name: "Cena Perdida",
        scene_type: "FORMATION",
        order: 3,
      };
      await expect(scene.create(data)).rejects.toThrow(ValidationError);
    });
  });

  describe("update() and del()", () => {
    let sceneToEdit;

    beforeAll(async () => {
      const data = {
        presentation_id: testPresentation.id,
        name: "Música Editável",
        scene_type: "FORMATION",
        order: 10,
      };
      sceneToEdit = await scene.create(data);
    });

    it("should update a scene's name and order", async () => {
      const updateData = {
        name: "Música Editada com Sucesso",
        order: 11,
      };
      const updatedScene = await scene.update(sceneToEdit.id, updateData);

      expect(updatedScene.id).toBe(sceneToEdit.id);
      expect(updatedScene.name).toBe("Música Editada com Sucesso");
      expect(updatedScene.order).toBe(11);
    });

    it("should throw NotFoundError when updating a non-existent scene", async () => {
      const randomId = orchestrator.generateRandomUUIDV4();
      await expect(
        scene.update(randomId, { name: "Fantasma" }),
      ).rejects.toThrow(NotFoundError);
    });

    it("should delete a scene", async () => {
      const deleted = await scene.del(sceneToEdit.id);
      expect(deleted.id).toBe(sceneToEdit.id);

      const found = await scene.findById(sceneToEdit.id);
      expect(found).toBeUndefined();
    });

    it("should throw NotFoundError when deleting a non-existent scene", async () => {
      const randomId = orchestrator.generateRandomUUIDV4();
      await expect(scene.del(randomId)).rejects.toThrow(NotFoundError);
    });
  });
});
