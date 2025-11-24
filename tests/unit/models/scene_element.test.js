import orchestrator from "tests/orchestrator.js";
import presentation from "models/presentation.js";
import scene from "models/scene.js";
import elementType from "models/element_type.js";
import sceneElement from "models/scene_element.js";
import user from "models/user.js";
import { settings } from "config/settings.js";
import { ValidationError, NotFoundError } from "errors/index.js";
import { v4 as uuid } from "uuid";

const MAX_ASSIGNEES = settings.global.STAGE_MAP_LOGIC.MAX_ASSIGNEES_PER_GROUP;

describe("Scene Element Model", () => {
  let adminUser, testPresentation, testScene, odaikoType, testUser;

  beforeAll(async () => {
    await orchestrator.waitForAllServices();
    await orchestrator.clearDatabase();
    await orchestrator.runPendingMigrations();

    adminUser = await user.findOneUser({ username: "mainUser" });
    testUser = await user.create({
      username: "alunoElemento",
      email: "elemento@test.com",
      password: "StrongPassword123@",
    });

    testPresentation = await presentation.create(
      { name: "Show de Elementos" },
      adminUser.id,
    );

    testScene = await scene.create({
      presentation_id: testPresentation.id,
      name: "Música com Elementos",
      scene_type: "FORMATION",
      order: 1,
    });

    odaikoType = await elementType.create({
      name: "Odaiko12",
      image_url: "/odaiko.svg",
      scale: 1.0,
    });
  });

  describe("create()", () => {
    it("should create a new element (and group) with multiple 'assignees'", async () => {
      const data = {
        scene_id: testScene.id,
        element_type_id: odaikoType.id,
        position_x: 10,
        position_y: 20,
        display_name: "Aluno 1",
        assignees: [testUser.id, adminUser.id],
      };
      const newElement = await sceneElement.create(data);

      expect(newElement.scene_id).toBe(testScene.id);
      expect(newElement.display_name).toBe("Aluno 1");
      expect(newElement.assignees).toBeInstanceOf(Array);
      expect(newElement.assignees).toHaveLength(2);
      expect(newElement.assignees).toContain(testUser.id);
      expect(newElement.assignees).toContain(adminUser.id);
    });

    it("should create an element with 'assignees' as an empty array", async () => {
      const data = {
        scene_id: testScene.id,
        element_type_id: odaikoType.id,
        position_x: 30,
        position_y: 40,
        display_name: "Odaiko",
        assignees: [],
      };
      const newElement = await sceneElement.create(data);
      expect(newElement.display_name).toBe("Odaiko");
      expect(newElement.assignees).toEqual([]);
    });

    it("should throw (ValidationError) when creating with 'assignees' over the limit", async () => {
      const uniqueUsers = [];
      for (let i = 0; i <= MAX_ASSIGNEES; i++) {
        uniqueUsers.push(uuid());
      }

      const data = {
        scene_id: testScene.id,
        element_type_id: odaikoType.id,
        position_x: 50,
        position_y: 50,
        assignees: uniqueUsers,
      };

      await expect(sceneElement.create(data)).rejects.toThrow(ValidationError);
    });
  });

  describe("update()", () => {
    let elementToEdit;

    beforeEach(async () => {
      elementToEdit = await sceneElement.create({
        scene_id: testScene.id,
        element_type_id: odaikoType.id,
        position_x: 1,
        position_y: 1,
        display_name: "Original Element",
        assignees: [testUser.id],
      });
    });

    it("should update only the position (scene_element)", async () => {
      const updateData = {
        position_x: 11.5,
      };
      const updatedElement = await sceneElement.update(
        elementToEdit.id,
        updateData,
      );

      expect(updatedElement.position_x).toBe(11.5);
      expect(updatedElement.display_name).toBe("Original Element");
      expect(updatedElement.assignees).toEqual([testUser.id]);
    });

    it("should update display_name (group) and 'assignees'", async () => {
      const updateData = {
        display_name: "New Name",
        assignees: [adminUser.id],
      };
      const updatedElement = await sceneElement.update(
        elementToEdit.id,
        updateData,
      );

      expect(updatedElement.display_name).toBe("New Name");
      expect(updatedElement.assignees).toEqual([adminUser.id]);
      expect(updatedElement.position_x).toBe(1);
    });

    it("should allow removing 'assignees' (empty array)", async () => {
      const updateData = {
        assignees: [],
      };
      const updatedElement = await sceneElement.update(
        elementToEdit.id,
        updateData,
      );
      expect(updatedElement.assignees).toEqual([]);
    });

    it("should throw NotFoundError when updating a non-existent element", async () => {
      const randomId = orchestrator.generateRandomUUIDV4();
      await expect(
        sceneElement.update(randomId, { position_x: 0 }),
      ).rejects.toThrow(NotFoundError);
    });

    it("should delete an element", async () => {
      const deleted = await sceneElement.del(elementToEdit.id);
      expect(deleted.id).toBe(elementToEdit.id);

      const found = await sceneElement.findById(elementToEdit.id);
      expect(found).toBeUndefined();
    });

    it("should throw NotFoundError when deleting a non-existent element", async () => {
      const randomId = orchestrator.generateRandomUUIDV4();
      await expect(sceneElement.del(randomId)).rejects.toThrow(NotFoundError);
    });
  });
});
