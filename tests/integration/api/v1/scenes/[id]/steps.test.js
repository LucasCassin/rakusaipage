import orchestrator from "tests/orchestrator.js";
import user from "models/user.js";
import session from "models/session.js";
import presentation from "models/presentation.js";
import scene from "models/scene.js";

describe("Test /api/v1/scenes/[id]/steps routes", () => {
  let adminUser, alunoUser, tocadorUser;
  let testPresentation, sceneTransition, sceneFormation;

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
      "create:presentation", // Para criar a apresentação
      "create:scene", // Para criar as cenas
      "create:step", // A feature que estamos testando
    ]);

    // 2. Criar Aluno (sem features)
    alunoUser = await user.create({
      username: "alunoStep",
      email: "alunostep@test.com",
      password: "StrongPassword123@",
    });
    alunoUser = await user.update({
      id: alunoUser.id,
      password: "StrongPassword123@",
    });

    // 3. Criar usuário para ser "atribuído"
    tocadorUser = await user.create({
      username: "tocadorStep",
      email: "tocadorstep@test.com",
      password: "StrongPassword123@",
    });

    // 4. Criar Apresentação e Cenas (UMA DE CADA TIPO)
    testPresentation = await presentation.create(
      { name: "Show para Passos" },
      adminUser.id,
    );
    // A cena correta para o teste
    sceneTransition = await scene.create({
      presentation_id: testPresentation.id,
      name: "Cena de Transição",
      scene_type: "TRANSITION", // TIPO CORRETO
      order: 1,
    });
    // A cena que deve falhar no teste
    sceneFormation = await scene.create({
      presentation_id: testPresentation.id,
      name: "Cena de Formação",
      scene_type: "FORMATION", // TIPO ERRADO
      order: 2,
    });
  });

  describe("POST /api/v1/scenes/[id]/steps", () => {
    it("should allow an Admin (create:step) to add a step to a 'TRANSITION' scene", async () => {
      const newSession = await session.create(adminUser);
      const stepData = {
        order: 1,
        description: "Pegar baquetas",
        assigned_user_id: tocadorUser.id,
      };

      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/scenes/${sceneTransition.id}/steps`, // Usando a cena de TRANSIÇÃO
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${newSession.token}`,
          },
          body: JSON.stringify(stepData),
        },
      );
      const resBody = await res.json();

      expect(res.status).toBe(201);
      expect(resBody.scene_id).toBe(sceneTransition.id);
      expect(resBody.description).toBe("Pegar baquetas");
      expect(resBody.assigned_user_id).toBe(tocadorUser.id);
    });

    it("should return 403 (Forbidden) when trying to add a step to a 'FORMATION' scene", async () => {
      const newSession = await session.create(adminUser);
      const stepData = {
        order: 1,
        description: "Este passo não deve ser criado",
      };

      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/scenes/${sceneFormation.id}/steps`, // Usando a cena de FORMAÇÃO
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${newSession.token}`,
          },
          body: JSON.stringify(stepData),
        },
      );
      // A rota refatorada/steps.js` (refactored)] retorna 403 se o tipo for errado.
      expect(res.status).toBe(403);
    });

    it("should return 400 for invalid data (missing 'description')", async () => {
      const newSession = await session.create(adminUser);
      const stepData = {
        order: 2,
        // 'description' está faltando
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
      expect(res.status).toBe(400); // Erro do validator.js
    });

    it("should return 404 for a non-existent scene ID", async () => {
      const newSession = await session.create(adminUser);
      const randomId = orchestrator.generateRandomUUIDV4();
      const stepData = {
        order: 1,
        description: "Passo fantasma",
      };

      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/scenes/${randomId}/steps`, // ID inválido
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${newSession.token}`,
          },
          body: JSON.stringify(stepData),
        },
      );
      // O middleware 'validateSceneType'/steps.js` (refactored)] falha com 404
      expect(res.status).toBe(404);
    });

    it("should return 403 for an Aluno (no 'create:step' feature)", async () => {
      const newSession = await session.create(alunoUser); // Sessão do Aluno
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
      expect(res.status).toBe(403); // O aluno não tem a "chave"
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
