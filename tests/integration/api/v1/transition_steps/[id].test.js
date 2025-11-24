import orchestrator from "tests/orchestrator.js";
import user from "models/user.js";
import session from "models/session.js";
import presentation from "models/presentation.js";
import scene from "models/scene.js";
import transitionStep from "models/transition_step.js";
import { settings } from "config/settings.js";
import { v4 as uuid } from "uuid";

const MAX_ASSIGNEES = settings.global.STAGE_MAP_LOGIC.MAX_ASSIGNEES_PER_STEP;

describe("Test /api/v1/transition_steps/[id] routes", () => {
  let adminUser, alunoUser, tocadorUser;
  let testScene, stepToEdit, stepToDelete;

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
      "update:step",
      "delete:step",
    ]);

    alunoUser = await user.create({
      username: "alunoStepId",
      email: "alunostepid@test.com",
      password: "StrongPassword123@",
    });
    alunoUser = await user.update({
      id: alunoUser.id,
      password: "StrongPassword123@",
    });

    tocadorUser = await user.create({
      username: "tocadorStepId",
      email: "tocadorstepid@test.com",
      password: "StrongPassword123@",
    });

    tocadorUser = await user.update({
      id: tocadorUser.id,
      password: "StrongPassword123@",
    });

    const testPresentation = await presentation.create(
      { name: "Apresentação de Steps ID" },
      adminUser.id,
    );
    testScene = await scene.create({
      presentation_id: testPresentation.id,
      name: "Cena de Transição ID",
      scene_type: "TRANSITION",
      order: 1,
    });
  });

  describe("PATCH", () => {
    beforeEach(async () => {
      stepToEdit = await transitionStep.create({
        scene_id: testScene.id,
        order: 1,
        description: "Descrição Original",
        assignees: [alunoUser.id],
      });
      stepToDelete = await transitionStep.create({
        scene_id: testScene.id,
        order: 2,
        description: "Passo para Deletar",
      });
    });

    it("should return 200 for Admin and update the step (multiple assignees)", async () => {
      const newSession = await session.create(adminUser);
      const updateData = {
        description: "Descrição Atualizada",
        order: 2,
        assignees: [tocadorUser.id, adminUser.id],
      };

      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/transition_steps/${stepToEdit.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${newSession.token}`,
          },
          body: JSON.stringify(updateData),
        },
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.description).toBe("Descrição Atualizada");
      expect(body.order).toBe(2);
      expect(body.assignees).toHaveLength(2);
      expect(body.assignees).toContain(tocadorUser.id);
      expect(body.id).toBe(stepToEdit.id);
    });

    it("should return 200 for Admin and update the step (single assignee)", async () => {
      const newSession = await session.create(adminUser);
      const updateData = {
        assignees: [tocadorUser.id],
      };
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/transition_steps/${stepToEdit.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${newSession.token}`,
          },
          body: JSON.stringify(updateData),
        },
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.assignees).toEqual([tocadorUser.id]);
    });

    it("should return 200 for Admin and remove assignees (empty array)", async () => {
      const newSession = await session.create(adminUser);
      const updateData = {
        assignees: [],
      };
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/transition_steps/${stepToEdit.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${newSession.token}`,
          },
          body: JSON.stringify(updateData),
        },
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.assignees).toEqual([]);
    });

    it("should return 400 (ValidationError) if assignees array exceeds limit", async () => {
      const newSession = await session.create(adminUser);
      const tooManyUsers = [];
      for (let i = 0; i <= MAX_ASSIGNEES; i++) {
        tooManyUsers.push(uuid());
      }

      const updateData = {
        assignees: tooManyUsers,
      };

      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/transition_steps/${stepToEdit.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${newSession.token}`,
          },
          body: JSON.stringify(updateData),
        },
      );
      expect(res.status).toBe(400);
    });

    it("should return 400 for invalid data (e.g., 'order' negative)", async () => {
      const newSession = await session.create(adminUser);
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/transition_steps/${stepToEdit.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${newSession.token}`,
          },
          body: JSON.stringify({ order: -5 }),
        },
      );
      expect(res.status).toBe(400);
    });

    it("should return 404 for a non-existent step ID", async () => {
      const newSession = await session.create(adminUser);
      const randomId = orchestrator.generateRandomUUIDV4();
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/transition_steps/${randomId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${newSession.token}`,
          },
          body: JSON.stringify({ description: "Fantasma" }),
        },
      );
      expect(res.status).toBe(404);
    });

    it("should return 403 for an Aluno (no 'update:step' feature)", async () => {
      const newSession = await session.create(alunoUser);
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/transition_steps/${stepToEdit.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${newSession.token}`,
          },
          body: JSON.stringify({ description: "Tentativa do Aluno" }),
        },
      );
      expect(res.status).toBe(403);
    });
  });

  describe("DELETE /api/v1/transition_steps/[id]", () => {
    it("should allow an Admin (delete:step) to delete a step", async () => {
      const newSession = await session.create(adminUser);
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/transition_steps/${stepToDelete.id}`,
        {
          method: "DELETE",
          headers: { cookie: `session_id=${newSession.token}` },
        },
      );
      const resBody = await res.json();

      expect(res.status).toBe(200);
      expect(resBody.id).toBe(stepToDelete.id);

      const patchRes = await fetch(
        `${orchestrator.webserverUrl}/api/v1/transition_steps/${stepToDelete.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${newSession.token}`,
          },
          body: JSON.stringify({ description: "Fantasma" }),
        },
      );
      expect(patchRes.status).toBe(404);
    });

    it("should return 404 when trying to delete a non-existent step", async () => {
      const newSession = await session.create(adminUser);
      const randomId = orchestrator.generateRandomUUIDV4();
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/transition_steps/${randomId}`,
        {
          method: "DELETE",
          headers: { cookie: `session_id=${newSession.token}` },
        },
      );
      expect(res.status).toBe(404);
    });

    it("should return 403 for an Aluno (no 'delete:step' feature)", async () => {
      const newSession = await session.create(alunoUser);
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/transition_steps/${stepToEdit.id}`,
        {
          method: "DELETE",
          headers: { cookie: `session_id=${newSession.token}` },
        },
      );
      expect(res.status).toBe(403);
    });
  });

  describe("Disallowed Methods", () => {
    const url = `${orchestrator.webserverUrl}/api/v1/transition_steps/${orchestrator.generateRandomUUIDV4()}`;

    it("should return 405 for GET", async () => {
      const res = await fetch(url, { method: "GET" });
      expect(res.status).toBe(405);
    });

    it("should return 405 for POST", async () => {
      const res = await fetch(url, { method: "POST" });
      expect(res.status).toBe(405);
    });

    it("should return 405 for PUT", async () => {
      const res = await fetch(url, { method: "PUT" });
      expect(res.status).toBe(405);
    });
  });
});
