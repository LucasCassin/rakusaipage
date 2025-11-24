import orchestrator from "tests/orchestrator.js";
import user from "models/user.js";
import session from "models/session.js";
import presentation from "models/presentation.js";
import scene from "models/scene.js";
import elementType from "models/element_type.js";
import sceneElement from "models/scene_element.js";
import database from "infra/database";
import { settings } from "config/settings.js";
import { v4 as uuid } from "uuid";

const MAX_ASSIGNEES = settings.global.STAGE_MAP_LOGIC.MAX_ASSIGNEES_PER_GROUP;

describe("Test /api/v1/scene_elements/[id] routes", () => {
  let adminUser, adminSession, alunoUser, tocadorUser;
  let testScene, odaikoType;
  let elementToTest;

  beforeAll(async () => {
    await orchestrator.waitForAllServices();
    await orchestrator.clearDatabase();
    await orchestrator.runPendingMigrations();

    adminUser = await user.findOneUser({ username: "mainUser" });
    adminUser = await user.update({
      id: adminUser.id,
      password: "StrongPassword123@",
    });
    adminUser = await user.addFeatures(adminUser, [
      "create:presentation",
      "create:scene",
      "create:element",
      "manage:element_types",
      "read:element",
      "update:element",
      "delete:element",
    ]);
    adminSession = await session.create(adminUser);

    alunoUser = await user.create({
      username: "alunoElementId",
      email: "alunoelementid@test.com",
      password: "StrongPassword123@",
    });

    alunoUser = await user.update({
      id: alunoUser.id,
      password: "StrongPassword123@",
    });

    tocadorUser = await user.create({
      username: "tocadorElementId",
      email: "tocadorelementid@test.com",
      password: "StrongPassword123@",
    });

    tocadorUser = await user.update({
      id: tocadorUser.id,
      password: "StrongPassword123@",
    });

    const testPresentation = await presentation.create(
      { name: "Apresentação de Elements ID" },
      adminUser.id,
    );
    testScene = await scene.create({
      presentation_id: testPresentation.id,
      name: "Cena de Formação ID",
      scene_type: "FORMATION",
      order: 1,
    });
    odaikoType = await elementType.create({
      name: "Odaiko (Teste Element ID)",
      image_url: "/odaiko.svg",
      scale: 1.0,
    });
  });

  beforeEach(async () => {
    elementToTest = await sceneElement.create({
      scene_id: testScene.id,
      element_type_id: odaikoType.id,
      position_x: 10,
      position_y: 10,
      display_name: "Original",
      assignees: [alunoUser.id],
    });
  });

  describe("GET", () => {
    it("should return 200 and the element data (including assignees)", async () => {
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/scene_elements/${elementToTest.id}`,
        {
          method: "GET",
          headers: { cookie: `session_id=${adminSession.token}` },
        },
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.id).toBe(elementToTest.id);
      expect(body.display_name).toBe("Original");
      expect(body.assignees).toEqual([alunoUser.id]);
    });
  });

  describe("PATCH", () => {
    it("should return 200 and update the group (name and multiple assignees)", async () => {
      const updateData = {
        display_name: "Novo Nome",
        assignees: [tocadorUser.id, adminUser.id],
      };
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/scene_elements/${elementToTest.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${adminSession.token}`,
          },
          body: JSON.stringify(updateData),
        },
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.display_name).toBe("Novo Nome");
      expect(body.assignees).toHaveLength(2);
      expect(body.assignees).toContain(tocadorUser.id);
    });

    it("should return 200 and update assignees (single user)", async () => {
      const updateData = {
        assignees: [adminUser.id],
      };
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/scene_elements/${elementToTest.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${adminSession.token}`,
          },
          body: JSON.stringify(updateData),
        },
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.assignees).toEqual([adminUser.id]);
    });

    it("should return 200 and remove assignees (empty array)", async () => {
      const updateData = {
        assignees: [],
      };
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/scene_elements/${elementToTest.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${adminSession.token}`,
          },
          body: JSON.stringify(updateData),
        },
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.assignees).toEqual([]);
    });

    it("should return 400 (ValidationError) if assignees array exceeds limit", async () => {
      const tooManyUsers = [];
      for (let i = 0; i <= MAX_ASSIGNEES; i++) {
        tooManyUsers.push(uuid());
      }

      const updateData = {
        assignees: tooManyUsers,
      };
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/scene_elements/${elementToTest.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${adminSession.token}`,
          },
          body: JSON.stringify(updateData),
        },
      );
      expect(res.status).toBe(400);
    });

    it("should update element position and group name in one transaction", async () => {
      const updateData = {
        position_x: 99.9,
        display_name: "Nome Atualizado",
      };

      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/scene_elements/${elementToTest.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${adminSession.token}`,
          },
          body: JSON.stringify(updateData),
        },
      );
      const resBody = await res.json();

      expect(res.status).toBe(200);
      expect(resBody.position_x).toBe(99.9);
      expect(resBody.position_y).toBe(10);

      const groupRes = await database.query({
        text: `SELECT display_name FROM element_groups WHERE id = $1`,
        values: [elementToTest.group_id],
      });
      expect(groupRes.rows[0].display_name).toBe("Nome Atualizado");
    });
  });

  describe("DELETE /api/v1/scene_elements/[id]", () => {
    it("should delete the element AND its group (if orphan)", async () => {
      const groupId = elementToTest.group_id;

      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/scene_elements/${elementToTest.id}`,
        {
          method: "DELETE",
          headers: { cookie: `session_id=${adminSession.token}` },
        },
      );
      expect(res.status).toBe(200);

      const elRes = await database.query({
        text: `SELECT COUNT(*) FROM scene_elements WHERE id = $1`,
        values: [elementToTest.id],
      });
      expect(elRes.rows[0].count).toBe("0");

      const groupRes = await database.query({
        text: `SELECT COUNT(*) FROM element_groups WHERE id = $1`,
        values: [groupId],
      });
      expect(groupRes.rows[0].count).toBe("0");
    });

    it("should delete the element but NOT the group (if not orphan)", async () => {
      const groupId = elementToTest.group_id;

      await database.query({
        text: `INSERT INTO scene_elements (scene_id, element_type_id, group_id, position_x, position_y)
               VALUES ($1, $2, $3, 40, 40)`,
        values: [testScene.id, odaikoType.id, groupId],
      });

      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/scene_elements/${elementToTest.id}`,
        {
          method: "DELETE",
          headers: { cookie: `session_id=${adminSession.token}` },
        },
      );
      expect(res.status).toBe(200);

      const groupRes = await database.query({
        text: `SELECT COUNT(*) FROM element_groups WHERE id = $1`,
        values: [groupId],
      });
      expect(groupRes.rows[0].count).toBe("1");
    });
  });
});
