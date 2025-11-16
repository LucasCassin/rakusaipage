import orchestrator from "tests/orchestrator.js";
import user from "models/user.js";
import session from "models/session.js";
import presentation from "models/presentation.js";
import scene from "models/scene.js";
import { settings } from "config/settings.js";
import { v4 as uuid } from "uuid";

const MAX_ASSIGNEES = settings.global.STAGE_MAP_LOGIC.MAX_ASSIGNEES_PER_STEP;

describe("Test /api/v1/scenes/[id]/steps routes", () => {
  let adminUser, alunoUser, tocadorUser;
  let testPresentation, sceneTransition, sceneFormation;

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
      "create:step",
    ]);

    alunoUser = await user.create({
      username: "alunoStep",
      email: "alunostep@test.com",
      password: "StrongPassword123@",
    });

    alunoUser = await user.update({
      id: alunoUser.id,
      password: "StrongPassword123@",
    });

    tocadorUser = await user.create({
      username: "tocadorStep",
      email: "tocadorstep@test.com",
      password: "StrongPassword123@",
    });

    tocadorUser = await user.update({
      id: tocadorUser.id,
      password: "StrongPassword123@",
    });

    testPresentation = await presentation.create(
      { name: "Apresentação de Steps" },
      adminUser.id,
    );
    sceneTransition = await scene.create({
      presentation_id: testPresentation.id,
      name: "Cena de Transição",
      scene_type: "TRANSITION",
      order: 1,
    });
    sceneFormation = await scene.create({
      presentation_id: testPresentation.id,
      name: "Cena de Formação",
      scene_type: "FORMATION",
      order: 2,
    });
  });

  describe("POST", () => {
    it("should return 201 for Admin and create a new step (with one assignee)", async () => {
      const newSession = await session.create(adminUser);
      const stepData = {
        order: 1,
        description: "Lucas entra com okedo",
        assignees: [tocadorUser.id],
      };

      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/scenes/${sceneTransition.id}/steps`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${newSession.token}`,
          },
          body: JSON.stringify(stepData),
        },
      );
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.description).toBe("Lucas entra com okedo");
      expect(Array.isArray(body.assignees)).toBe(true);
      expect(body.assignees).toEqual([tocadorUser.id]);
    });

    it("should return 201 for Admin and create a new step (with multiple assignees)", async () => {
      const newSession = await session.create(adminUser);
      const stepData = {
        order: 2,
        description: "Lucas e Admin entram",
        assignees: [tocadorUser.id, adminUser.id],
      };

      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/scenes/${sceneTransition.id}/steps`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${newSession.token}`,
          },
          body: JSON.stringify(stepData),
        },
      );
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.assignees).toHaveLength(2);
      expect(body.assignees).toContain(tocadorUser.id);
      expect(body.assignees).toContain(adminUser.id);
    });

    it("should return 201 for Admin and create a new step (with empty assignees)", async () => {
      const newSession = await session.create(adminUser);
      const stepData = {
        order: 3,
        description: "Ninguém entra",
        assignees: [],
      };
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/scenes/${sceneTransition.id}/steps`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${newSession.token}`,
          },
          body: JSON.stringify(stepData),
        },
      );
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.assignees).toEqual([]);
    });

    it("should return 400 (ValidationError) if assignees array exceeds limit", async () => {
      const newSession = await session.create(adminUser);
      const tooManyUsers = [];
      for (let i = 0; i <= MAX_ASSIGNEES; i++) {
        tooManyUsers.push(uuid());
      }

      const stepData = {
        order: 4,
        description: "Muitos usuários",
        assignees: tooManyUsers,
      };

      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/scenes/${sceneTransition.id}/steps`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${newSession.token}`,
          },
          body: JSON.stringify(stepData),
        },
      );
      expect(res.status).toBe(400);
    });

    it("should return 403 (Forbidden) when trying to add a step to a 'FORMATION' scene", async () => {
      const newSession = await session.create(adminUser);
      const stepData = {
        order: 1,
        description: "Este passo não deve ser criado",
      };

      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/scenes/${sceneFormation.id}/steps`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${newSession.token}`,
          },
          body: JSON.stringify(stepData),
        },
      );

      expect(res.status).toBe(403);
    });

    it("should return 400 for invalid data (missing 'description')", async () => {
      const newSession = await session.create(adminUser);
      const stepData = {
        order: 2,
      };

      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/scenes/${sceneTransition.id}/steps`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${newSession.token}`,
          },
          body: JSON.stringify(stepData),
        },
      );
      expect(res.status).toBe(400);
    });

    it("should return 404 for a non-existent scene ID", async () => {
      const newSession = await session.create(adminUser);
      const randomId = orchestrator.generateRandomUUIDV4();
      const stepData = {
        order: 1,
        description: "Passo fantasma",
      };

      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/scenes/${randomId}/steps`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${newSession.token}`,
          },
          body: JSON.stringify(stepData),
        },
      );

      expect(res.status).toBe(404);
    });

    it("should return 403 for an Aluno (no 'create:step' feature)", async () => {
      const newSession = await session.create(alunoUser);
      const stepData = {
        order: 1,
        description: "Tentativa do Aluno",
      };

      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/scenes/${sceneTransition.id}/steps`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${newSession.token}`,
          },
          body: JSON.stringify(stepData),
        },
      );
      expect(res.status).toBe(403);
    });
  });

  describe("Disallowed Methods", () => {
    const url = `${orchestrator.webserverUrl}/api/v1/scenes/${orchestrator.generateRandomUUIDV4()}/steps`;

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
