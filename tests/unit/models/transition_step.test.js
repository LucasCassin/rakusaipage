import orchestrator from "tests/orchestrator.js";
import presentation from "models/presentation.js";
import scene from "models/scene.js";
import transitionStep from "models/transition_step.js";
import user from "models/user.js";
import { settings } from "config/settings.js";
import { ValidationError, NotFoundError } from "errors/index.js";
import { v4 as uuid } from "uuid";

const MAX_ASSIGNEES = settings.global.STAGE_MAP_LOGIC.MAX_ASSIGNEES_PER_STEP;

describe("Transition Step Model", () => {
  let adminUser, testUser, testTransitionScene;

  beforeAll(async () => {
    await orchestrator.waitForAllServices();
    await orchestrator.clearDatabase();
    await orchestrator.runPendingMigrations();

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
      scene_type: "TRANSITION",
      order: 1,
    });
  });

  describe("create()", () => {
    it("should create a new transition step with multiple 'assignees'", async () => {
      const data = {
        scene_id: testTransitionScene.id,
        order: 1,
        description: "Lucas and Admin enter with okedo",
        assignees: [testUser.id, adminUser.id],
      };
      const newStep = await transitionStep.create(data);

      expect(newStep.scene_id).toBe(testTransitionScene.id);
      expect(newStep.description).toBe("Lucas and Admin enter with okedo");
      expect(newStep.assignees).toBeInstanceOf(Array);
      expect(newStep.assignees).toHaveLength(2);
      expect(newStep.assignees).toContain(testUser.id);
      expect(newStep.assignees).toContain(adminUser.id);
    });

    it("should create a step with 'assignees' as an empty array", async () => {
      const data = {
        scene_id: testTransitionScene.id,
        order: 2,
        description: "No one moves",
        assignees: [],
      };
      const newStep = await transitionStep.create(data);
      expect(newStep.description).toBe("No one moves");
      expect(newStep.assignees).toEqual([]);
    });

    it("should create a step with 'assignees' as null or undefined", async () => {
      const data = {
        scene_id: testTransitionScene.id,
        order: 3,
        description: "Checklist (null)",
        assignees: null,
      };
      const newStep = await transitionStep.create(data);
      expect(newStep.assignees).toEqual([]);

      const data2 = {
        scene_id: testTransitionScene.id,
        order: 4,
        description: "Checklist (undefined)",
      };
      const newStep2 = await transitionStep.create(data2);
      expect(newStep2.assignees).toEqual([]);
    });

    it("should throw (ValidationError) when creating with 'assignees' over the limit", async () => {
      const uniqueUsers = [];
      for (let i = 0; i <= MAX_ASSIGNEES; i++) {
        uniqueUsers.push(uuid());
      }

      const data = {
        scene_id: testTransitionScene.id,
        order: 5,
        description: "Limit failure",
        assignees: uniqueUsers,
      };

      await expect(transitionStep.create(data)).rejects.toThrow(
        ValidationError,
      );
    });
  });

  describe("update()", () => {
    let stepToEdit;

    beforeEach(async () => {
      stepToEdit = await transitionStep.create({
        scene_id: testTransitionScene.id,
        order: 10,
        description: "Original Step",
        assignees: [testUser.id],
      });
    });

    it("should update description, order, and 'assignees'", async () => {
      const updateData = {
        description: "Updated Description",
        order: 11,
        assignees: [adminUser.id],
      };
      const updatedStep = await transitionStep.update(
        stepToEdit.id,
        updateData,
      );

      expect(updatedStep.id).toBe(stepToEdit.id);
      expect(updatedStep.description).toBe("Updated Description");
      expect(updatedStep.order).toBe(11);
      expect(updatedStep.assignees).toEqual([adminUser.id]);
    });

    it("should allow removing all 'assignees' (empty array)", async () => {
      const updateData = {
        assignees: [],
      };
      const updatedStep = await transitionStep.update(
        stepToEdit.id,
        updateData,
      );
      expect(updatedStep.assignees).toEqual([]);
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

      const found = await transitionStep.findById(stepToEdit.id);
      expect(found).toBeUndefined();
    });

    it("should throw NotFoundError when deleting a non-existent step", async () => {
      const randomId = orchestrator.generateRandomUUIDV4();
      await expect(transitionStep.del(randomId)).rejects.toThrow(NotFoundError);
    });
  });
});
