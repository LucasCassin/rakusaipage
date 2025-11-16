import orchestrator from "tests/orchestrator.js";
import user from "models/user.js";
import session from "models/session.js";
import presentation from "models/presentation.js";
import scene from "models/scene.js";
import elementType from "models/element_type.js";
import database from "infra/database";
import { settings } from "config/settings.js";
import { v4 as uuid } from "uuid";

const MAX_ASSIGNEES = settings.global.STAGE_MAP_LOGIC.MAX_ASSIGNEES_PER_GROUP;

describe("Test /api/v1/scenes/[id]/elements routes", () => {
  let adminUser, alunoUser, tocadorUser;
  let testPresentation, testScene, odaikoType;

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
    ]);

    alunoUser = await user.create({
      username: "alunoElement",
      email: "alunoelement@test.com",
      password: "StrongPassword123@",
    });
    alunoUser = await user.update({
      id: alunoUser.id,
      password: "StrongPassword123@",
    });

    tocadorUser = await user.create({
      username: "tocadorElement",
      email: "tocadorelement@test.com",
      password: "StrongPassword123@",
    });

    tocadorUser = await user.update({
      id: tocadorUser.id,
      password: "StrongPassword123@",
    });

    testPresentation = await presentation.create(
      { name: "Apresentação de Elements" },
      adminUser.id,
    );
    testScene = await scene.create({
      presentation_id: testPresentation.id,
      name: "Cena de Formação Elements",
      scene_type: "FORMATION",
      order: 1,
    });
    odaikoType = await elementType.create({
      name: "Odaiko (Teste Element)",
      image_url: "/odaiko.svg",
      scale: 1.0,
    });
  });

  describe("POST", () => {
    it("should return 201 for Admin and create a new element (with one assignee)", async () => {
      const newSession = await session.create(adminUser);
      const elementData = {
        element_type_id: odaikoType.id,
        position_x: 10,
        position_y: 10,
        display_name: "Tocador 1",
        assignees: [tocadorUser.id],
      };

      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/scenes/${testScene.id}/elements`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${newSession.token}`,
          },
          body: JSON.stringify(elementData),
        },
      );
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.display_name).toBe("Tocador 1");
      expect(Array.isArray(body.assignees)).toBe(true);
      expect(body.assignees).toEqual([tocadorUser.id]);
      expect(body.group_id).toBeDefined();
      expect(body.position_x).toBe(10);
      expect(body.position_y).toBe(10);
      expect(body.element_type_id).toBe(odaikoType.id);
      expect(body.scene_id).toBe(testScene.id);
      expect(body.display_name).toBe("Tocador 1");

      const groupRes = await database.query({
        text: `SELECT * FROM element_groups WHERE id = $1`,
        values: [body.group_id],
      });

      expect(groupRes.rowCount).toBe(1);
      const groupInDb = groupRes.rows[0];
      expect(groupInDb.display_name).toBe("Tocador 1");
      expect(groupInDb.scene_id).toBe(testScene.id);
    });

    it("should return 201 for Admin and create element (with multiple assignees)", async () => {
      const newSession = await session.create(adminUser);
      const elementData = {
        element_type_id: odaikoType.id,
        position_x: 20,
        position_y: 20,
        display_name: "Multiplos",
        assignees: [tocadorUser.id, adminUser.id],
      };

      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/scenes/${testScene.id}/elements`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${newSession.token}`,
          },
          body: JSON.stringify(elementData),
        },
      );
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.assignees).toHaveLength(2);
      expect(body.assignees).toContain(tocadorUser.id);
    });

    it("should return 201 for Admin and create element (with empty assignees)", async () => {
      const newSession = await session.create(adminUser);
      const elementData = {
        element_type_id: odaikoType.id,
        position_x: 30,
        position_y: 30,
        display_name: "Odaiko",
        assignees: [],
      };
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/scenes/${testScene.id}/elements`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${newSession.token}`,
          },
          body: JSON.stringify(elementData),
        },
      );
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.display_name).toBe("Odaiko");
      expect(body.assignees).toEqual([]);
    });

    it("should return 400 (ValidationError) if assignees array exceeds limit", async () => {
      const newSession = await session.create(adminUser);
      const tooManyUsers = [];
      for (let i = 0; i <= MAX_ASSIGNEES; i++) {
        tooManyUsers.push(uuid());
      }

      const elementData = {
        element_type_id: odaikoType.id,
        position_x: 40,
        position_y: 40,
        assignees: tooManyUsers,
      };

      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/scenes/${testScene.id}/elements`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${newSession.token}`,
          },
          body: JSON.stringify(elementData),
        },
      );
      expect(res.status).toBe(400);
    });

    it("should return 400 for invalid data (missing 'position_x')", async () => {
      const newSession = await session.create(adminUser);
      const elementData = {
        element_type_id: odaikoType.id,

        position_y: 75,
      };

      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/scenes/${testScene.id}/elements`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${newSession.token}`,
          },
          body: JSON.stringify(elementData),
        },
      );
      expect(res.status).toBe(400);
    });

    it("should return 409 for a non-existent scene ID", async () => {
      const newSession = await session.create(adminUser);
      const randomId = orchestrator.generateRandomUUIDV4();
      const elementData = {
        element_type_id: odaikoType.id,
        position_x: 50,
        position_y: 75,
      };

      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/scenes/${randomId}/elements`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${newSession.token}`,
          },
          body: JSON.stringify(elementData),
        },
      );

      expect(res.status).toBe(409);
    });

    it("should return 403 for an Aluno (no 'create:element' feature)", async () => {
      const newSession = await session.create(alunoUser);
      const elementData = {
        element_type_id: odaikoType.id,
        position_x: 10,
        position_y: 10,
      };

      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/scenes/${testScene.id}/elements`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${newSession.token}`,
          },
          body: JSON.stringify(elementData),
        },
      );
      expect(res.status).toBe(403);
    });
  });

  describe("Disallowed Methods", () => {
    const url = `${orchestrator.webserverUrl}/api/v1/scenes/${orchestrator.generateRandomUUIDV4()}/elements`;

    it("should return 405 for GET", async () => {
      const res = await fetch(url, { method: "GET" });
      expect(res.status).toBe(405);
    });

    it("should return 405 for PUT", async () => {
      const res = await fetch(url, { method: "PUT" });
      expect(res.status).toBe(405);
    });

    it("should return 405 for PATCH", async () => {
      const res = await fetch(url, { method: "PATCH" });
      expect(res.status).toBe(405);
    });

    it("should return 405 for DELETE", async () => {
      const res = await fetch(url, { method: "DELETE" });
      expect(res.status).toBe(405);
    });
  });
});
