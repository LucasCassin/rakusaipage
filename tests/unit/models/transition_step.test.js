import orchestrator from "tests/orchestrator.js";
import presentation from "models/presentation.js";
import scene from "models/scene.js";
import transitionStep from "models/transition_step.js"; // O modelo que estamos testando
import user from "models/user.js";
import { ValidationError, NotFoundError } from "errors/index.js";

describe("Transition Step Model", () => {
  let adminUser, testUser, testTransitionScene;

  beforeAll(async () => {
    await orchestrator.waitForAllServices();
    await orchestrator.clearDatabase();
    await orchestrator.runPendingMigrations();

    // Setup: 1 Usuário, 1 Apresentação, 1 Cena de Transição
    adminUser = await user.findOneUser({ username: "mainUser" });
    testUser = await user.create({
      username: "alunoTransicao",
      email: "transicao@test.com",
      password: "StrongPassword123@",
    });

    const testPresentation = await presentation.create(
      { name: "Show de Transições" },
      adminUser.id,
    );

    testTransitionScene = await scene.create({
      presentation_id: testPresentation.id,
      name: "Troca para Hajime",
      scene_type: "TRANSITION", //
      order: 1,
    });
  });

  describe("create()", () => {
    it("should create a new transition step", async () => {
      const data = {
        scene_id: testTransitionScene.id,
        order: 1,
        description: "Lucas entra com okedo",
        assigned_user_id: testUser.id,
      };
      const newStep = await transitionStep.create(data);

      expect(newStep.id).toBeDefined();
      expect(newStep.scene_id).toBe(testTransitionScene.id);
      expect(newStep.description).toBe("Lucas entra com okedo");
      expect(newStep.order).toBe(1);
      expect(newStep.assigned_user_id).toBe(testUser.id);
    });

    it("should fail with ValidationError if 'description' is missing", async () => {
      const data = {
        scene_id: testTransitionScene.id,
        order: 2,
      };
      await expect(transitionStep.create(data)).rejects.toThrow(
        ValidationError,
      );
    });

    it("should fail with ValidationError if 'scene_id' is missing", async () => {
      const data = {
        order: 2,
        description: "Passo perdido",
      };
      await expect(transitionStep.create(data)).rejects.toThrow(
        ValidationError,
      );
    });
  });

  describe("update() and del()", () => {
    let stepToEdit;

    beforeAll(async () => {
      // Cria um passo para ser usado nos testes
      const data = {
        scene_id: testTransitionScene.id,
        order: 10,
        description: "Descrição Original",
      };
      stepToEdit = await transitionStep.create(data);
    });

    it("should update a step's description, order, and assignment", async () => {
      const updateData = {
        order: 11,
        description: "Descrição Atualizada",
        assigned_user_id: adminUser.id,
      };
      const updatedStep = await transitionStep.update(
        stepToEdit.id,
        updateData,
      );

      expect(updatedStep.id).toBe(stepToEdit.id);
      expect(updatedStep.description).toBe("Descrição Atualizada");
      expect(updatedStep.order).toBe(11);
      expect(updatedStep.assigned_user_id).toBe(adminUser.id);
    });

    it("should allow un-assigning a user (setting to null)", async () => {
      const updateData = {
        assigned_user_id: null,
      };
      const updatedStep = await transitionStep.update(
        stepToEdit.id,
        updateData,
      );
      expect(updatedStep.assigned_user_id).toBeNull();
    });

    it("should throw NotFoundError when updating a non-existent step", async () => {
      const randomId = orchestrator.generateRandomUUIDV4();
      await expect(
        transitionStep.update(randomId, { order: 99 }),
      ).rejects.toThrow(NotFoundError);
    });

    it("should delete a step", async () => {
      const deleted = await transitionStep.del(stepToEdit.id);
      expect(deleted.id).toBe(stepToEdit.id);

      // Verifica se foi deletado
      const found = await transitionStep.findById(stepToEdit.id);
      expect(found).toBeUndefined();
    });

    it("should throw NotFoundError when deleting a non-existent step", async () => {
      const randomId = orchestrator.generateRandomUUIDV4();
      await expect(transitionStep.del(randomId)).rejects.toThrow(NotFoundError);
    });
  });
});
