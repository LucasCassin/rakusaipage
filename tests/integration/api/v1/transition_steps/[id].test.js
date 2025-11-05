import orchestrator from "tests/orchestrator.js";
import user from "models/user.js";
import session from "models/session.js";
import presentation from "models/presentation.js";
import scene from "models/scene.js";
import transitionStep from "models/transition_step.js";

describe("Test /api/v1/transition_steps/[id] routes", () => {
  let adminUser, alunoUser, tocadorUser;
  let testScene, stepToEdit, stepToDelete;

  beforeAll(async () => {
    await orchestrator.waitForAllServices();
    await orchestrator.clearDatabase();
    await orchestrator.runPendingMigrations();

    // 1. Criar Admin, atualizar senha e dar features
    adminUser = await user.findOneUser({ username: "mainUser" });
    adminUser = await user.update({
      id: adminUser.id,
      password: "StrongPassword123@", // Senha de admin
    });
    adminUser = await user.addFeatures(adminUser, [
      "create:presentation",
      "create:scene",
      "create:step",
      "update:step", // Feature para PATCH
      "delete:step", // Feature para DELETE
    ]);

    // 2. Criar Aluno (sem features)
    alunoUser = await user.create({
      username: "alunoStepId",
      email: "alunostepid@test.com",
      password: "StrongPassword123@",
    });
    alunoUser = await user.update({
      id: alunoUser.id,
      password: "StrongPassword123@",
    });

    // 3. Criar usuário para ser "atribuído"
    tocadorUser = await user.create({
      username: "tocadorStepId",
      email: "tocadorstepid@test.com",
      password: "StrongPassword123@",
    });

    // 4. Criar Apresentação e Cena (DEVE ser TRANSITION)
    const testPresentation = await presentation.create(
      { name: "Show para Passos ID" },
      adminUser.id,
    );
    testScene = await scene.create({
      presentation_id: testPresentation.id,
      name: "Cena de Transição ID",
      scene_type: "TRANSITION", // Obrigatório para 'transition_steps'
      order: 1,
    });

    // 5. Criar passos de teste
    stepToEdit = await transitionStep.create({
      scene_id: testScene.id,
      order: 1,
      description: "Descrição Original",
    });
    stepToDelete = await transitionStep.create({
      scene_id: testScene.id,
      order: 2,
      description: "Passo para Deletar",
    });
  });

  describe("PATCH /api/v1/transition_steps/[id]", () => {
    it("should allow an Admin (update:step) to update a step", async () => {
      const newSession = await session.create(adminUser);
      const patchData = {
        order: 10,
        description: "Descrição Editada",
        assigned_user_id: tocadorUser.id,
      };

      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/transition_steps/${stepToEdit.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${newSession.token}`,
          },
          body: JSON.stringify(patchData),
        },
      );
      const resBody = await res.json();

      expect(res.status).toBe(200);
      expect(resBody.id).toBe(stepToEdit.id);
      expect(resBody.description).toBe("Descrição Editada");
      expect(resBody.order).toBe(10);
      expect(resBody.assigned_user_id).toBe(tocadorUser.id);
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
          body: JSON.stringify({ order: -5 }), // Inválido
        },
      );
      expect(res.status).toBe(400); // Erro do validator.js
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
      expect(res.status).toBe(404); // Erro do modelo transitionStep.update
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

      // Verificar se foi deletado (PATCH deve dar 404)
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
      expect(res.status).toBe(404); // Erro do modelo transitionStep.del
    });

    it("should return 403 for an Aluno (no 'delete:step' feature)", async () => {
      const newSession = await session.create(alunoUser);
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/transition_steps/${stepToEdit.id}`, // Tenta deletar o passo que sobrou
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
