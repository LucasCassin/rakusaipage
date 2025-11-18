import orchestrator from "tests/orchestrator.js";
import elementGroup from "models/element_group.js";
import sceneElement from "models/scene_element.js";
import presentation from "models/presentation.js";
import scene from "models/scene.js";
import elementType from "models/element_type.js";
import user from "models/user.js";
import database from "infra/database.js";
import { ValidationError, NotFoundError, ServiceError } from "errors/index.js";
import { settings } from "config/settings.js";
import { v4 as uuid } from "uuid";

const MAX_ASSIGNEES = settings.global.STAGE_MAP_LOGIC.MAX_ASSIGNEES_PER_GROUP;

describe("Element Group Model Tests", () => {
  let adminUser, user1, user2;
  let testPresentation, testScene, odaikoType;

  beforeAll(async () => {
    await orchestrator.waitForAllServices();
    await orchestrator.clearDatabase();
    await orchestrator.runPendingMigrations();

    // 1. Criar Usuários
    adminUser = await user.findOneUser({ username: "mainUser" });
    user1 = await user.create({
      username: "userGroup1",
      email: "group1@test.com",
      password: "StrongPassword123@",
    });
    user2 = await user.create({
      username: "userGroup2",
      email: "group2@test.com",
      password: "StrongPassword123@",
    });

    // 2. Criar Dados Base
    testPresentation = await presentation.create(
      { name: "Group Tests" },
      adminUser.id,
    );
    testScene = await scene.create({
      presentation_id: testPresentation.id,
      name: "Scene 1",
      scene_type: "FORMATION",
      order: 1,
    });
    odaikoType = await elementType.create({
      name: "OdaikoGroup",
      image_url: "/odaiko.svg",
      scale: 1.0,
    });
  });

  describe("update()", () => {
    let groupToUpdate;

    beforeEach(async () => {
      // Cria um elemento (e consequentemente um grupo) para cada teste
      const element = await sceneElement.create({
        scene_id: testScene.id,
        element_type_id: odaikoType.id,
        position_x: 10,
        position_y: 10,
        display_name: "Original Name",
        assignees: [user1.id],
      });
      // Busca o grupo criado
      groupToUpdate = await elementGroup.findGroupById(element.group_id);
    });

    it("should update only the display_name", async () => {
      const updatedGroup = await elementGroup.update(groupToUpdate.id, {
        display_name: "Updated Name",
      });

      expect(updatedGroup.id).toBe(groupToUpdate.id);
      expect(updatedGroup.display_name).toBe("Updated Name");
      // Os assignees devem permanecer inalterados
      expect(updatedGroup.assignees).toEqual([user1.id]);
    });

    it("should update only the assignees (replace users)", async () => {
      const updatedGroup = await elementGroup.update(groupToUpdate.id, {
        assignees: [user2.id],
      });

      expect(updatedGroup.display_name).toBe("Original Name");
      expect(updatedGroup.assignees).toHaveLength(1);
      expect(updatedGroup.assignees).toEqual([user2.id]);
    });

    it("should add multiple assignees", async () => {
      const updatedGroup = await elementGroup.update(groupToUpdate.id, {
        assignees: [user1.id, user2.id],
      });

      expect(updatedGroup.assignees).toHaveLength(2);
      expect(updatedGroup.assignees).toContain(user1.id);
      expect(updatedGroup.assignees).toContain(user2.id);
    });

    it("should clear assignees (empty array)", async () => {
      const updatedGroup = await elementGroup.update(groupToUpdate.id, {
        assignees: [],
      });

      expect(updatedGroup.assignees).toEqual([]);
    });

    it("should update both display_name and assignees", async () => {
      const updatedGroup = await elementGroup.update(groupToUpdate.id, {
        display_name: "Full Update",
        assignees: [user2.id],
      });

      expect(updatedGroup.display_name).toBe("Full Update");
      expect(updatedGroup.assignees).toEqual([user2.id]);
    });

    it("should throw ValidationError if assignees exceed limit", async () => {
      const tooManyUsers = [];
      for (let i = 0; i <= MAX_ASSIGNEES; i++) {
        tooManyUsers.push(uuid());
      }

      await expect(
        elementGroup.update(groupToUpdate.id, { assignees: tooManyUsers }),
      ).rejects.toThrow(ValidationError);
    });

    it("should throw NotFoundError if group does not exist", async () => {
      const fakeId = uuid();
      await expect(
        elementGroup.update(fakeId, { display_name: "Ghost" }),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe("mergeGroups()", () => {
    let groupTarget, groupSource, elementTarget, elementSource;

    beforeEach(async () => {
      // Grupo A (Alvo)
      elementTarget = await sceneElement.create({
        scene_id: testScene.id,
        element_type_id: odaikoType.id,
        position_x: 10,
        position_y: 10,
        display_name: "Target Group",
      });
      groupTarget = await elementGroup.findGroupById(elementTarget.group_id);

      // Grupo B (Fonte)
      elementSource = await sceneElement.create({
        scene_id: testScene.id,
        element_type_id: odaikoType.id,
        position_x: 20,
        position_y: 20,
        display_name: "Source Group",
      });
      groupSource = await elementGroup.findGroupById(elementSource.group_id);
    });

    it("should move elements from source to target and delete source group", async () => {
      const result = await elementGroup.merge(groupTarget.id, groupSource.id);

      expect(result.elements_moved).toBe(1);

      // 1. Verificar se o elemento fonte mudou de grupo
      const updatedSourceElement = await sceneElement.findById(
        elementSource.id,
      );
      expect(updatedSourceElement.group_id).toBe(groupTarget.id);

      // 2. Verificar se o grupo fonte foi deletado
      const deletedGroup = await elementGroup.findGroupById(groupSource.id);
      expect(deletedGroup).toBeUndefined();

      // 3. Verificar se o grupo alvo ainda existe
      const targetGroupCheck = await elementGroup.findGroupById(groupTarget.id);
      expect(targetGroupCheck).toBeDefined();
    });

    it("should throw ServiceError if trying to merge a group with itself", async () => {
      await expect(
        elementGroup.merge(groupTarget.id, groupTarget.id),
      ).rejects.toThrow(ServiceError);
    });

    // Teste de integridade referencial (se falhar, o banco lançaria erro, o teste captura)
    it("should fail gracefully (or throw specific db error) if target group doesn't exist", async () => {
      const fakeId = uuid();
      // O banco deve lançar violação de FK ao tentar mover elementos para ID inexistente
      await expect(
        elementGroup.merge(fakeId, groupSource.id),
      ).rejects.toThrow();
    });
  });

  describe("del()", () => {
    let groupToDelete;

    beforeEach(async () => {
      const element = await sceneElement.create({
        scene_id: testScene.id,
        element_type_id: odaikoType.id,
        position_x: 50,
        position_y: 50,
        assignees: [user1.id],
      });
      groupToDelete = await elementGroup.findGroupById(element.group_id);
    });

    it("should delete group and cascade delete assignees", async () => {
      // Verifica que existe antes
      const assigneesBefore = await database.query({
        text: "SELECT * FROM element_group_assignees WHERE element_group_id = $1",
        values: [groupToDelete.id],
      });
      expect(assigneesBefore.rows).toHaveLength(1);

      // Deleta
      await elementGroup.del(groupToDelete.id);

      // Verifica se sumiu
      const groupAfter = await elementGroup.findGroupById(groupToDelete.id);
      expect(groupAfter).toBeUndefined();

      // Verifica cascade na tabela de associação
      const assigneesAfter = await database.query({
        text: "SELECT * FROM element_group_assignees WHERE element_group_id = $1",
        values: [groupToDelete.id],
      });
      expect(assigneesAfter.rows).toHaveLength(0);
    });

    it("should throw NotFoundError if group doesn't exist", async () => {
      await expect(elementGroup.del(uuid())).rejects.toThrow(NotFoundError);
    });
  });
});
