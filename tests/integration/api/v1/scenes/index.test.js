import orchestrator from "tests/orchestrator.js";
import user from "models/user.js";
import session from "models/session.js";
import presentation from "models/presentation.js";

describe("Test /api/v1/scenes routes", () => {
  let adminUser, alunoUser;
  let testPresentation;

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
      "create:scene", // A feature que estamos testando
    ]);

    // 2. Criar Aluno (sem features)
    alunoUser = await user.create({
      username: "alunoScene",
      email: "alunoscene@test.com",
      password: "StrongPassword123@",
    });
    alunoUser = await user.update({
      id: alunoUser.id,
      password: "StrongPassword123@",
    });

    // 3. Criar a Apresentação
    testPresentation = await presentation.create(
      { name: "Show para Cenas" },
      adminUser.id,
    );
  });

  describe("POST /api/v1/scenes", () => {
    it("should allow an Admin (create:scene) to create a 'FORMATION' scene", async () => {
      const newSession = await session.create(adminUser);
      const sceneData = {
        presentation_id: testPresentation.id,
        name: "Música 1 (Hajime)",
        scene_type: "FORMATION",
        order: 1,
        description: "Início do show",
      };

      const res = await fetch(`${orchestrator.webserverUrl}/api/v1/scenes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `session_id=${newSession.token}`,
        },
        body: JSON.stringify(sceneData),
      });
      const resBody = await res.json();

      expect(res.status).toBe(201);
      expect(resBody.name).toBe("Música 1 (Hajime)");
      expect(resBody.scene_type).toBe("FORMATION");
    });

    it("should allow an Admin (create:scene) to create a 'TRANSITION' scene", async () => {
      const newSession = await session.create(adminUser);
      const sceneData = {
        presentation_id: testPresentation.id,
        name: "Troca para Jousui",
        scene_type: "TRANSITION",
        order: 2,
      };

      const res = await fetch(`${orchestrator.webserverUrl}/api/v1/scenes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `session_id=${newSession.token}`,
        },
        body: JSON.stringify(sceneData),
      });
      const resBody = await res.json();

      expect(res.status).toBe(201);
      expect(resBody.name).toBe("Troca para Jousui");
      expect(resBody.scene_type).toBe("TRANSITION");
    });

    it("should return 400 for invalid data (missing 'name')", async () => {
      const newSession = await session.create(adminUser);
      const sceneData = {
        presentation_id: testPresentation.id,
        // 'name' está faltando
        scene_type: "FORMATION",
        order: 3,
      };

      const res = await fetch(`${orchestrator.webserverUrl}/api/v1/scenes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `session_id=${newSession.token}`,
        },
        body: JSON.stringify(sceneData),
      });
      expect(res.status).toBe(400); // Erro do validator.js
    });

    it("should return 400 for invalid data (invalid 'scene_type')", async () => {
      const newSession = await session.create(adminUser);
      const sceneData = {
        presentation_id: testPresentation.id,
        name: "Cena Inválida",
        scene_type: "TIPO_INVALIDO", // Inválido
        order: 4,
      };

      const res = await fetch(`${orchestrator.webserverUrl}/api/v1/scenes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `session_id=${newSession.token}`,
        },
        body: JSON.stringify(sceneData),
      });
      expect(res.status).toBe(400); // Erro do validator.js
    });

    it("should return 403 for an Aluno (no 'create:scene' feature)", async () => {
      const newSession = await session.create(alunoUser);
      const sceneData = {
        presentation_id: testPresentation.id,
        name: "Tentativa do Aluno",
        scene_type: "FORMATION",
        order: 5,
      };

      const res = await fetch(`${orchestrator.webserverUrl}/api/v1/scenes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `session_id=${newSession.token}`,
        },
        body: JSON.stringify(sceneData),
      });
      expect(res.status).toBe(403);
    });

    it("should return 403 for an Anonymous user", async () => {
      const sceneData = {
        presentation_id: testPresentation.id,
        name: "Tentativa Anônima",
        scene_type: "FORMATION",
        order: 6,
      };

      const res = await fetch(`${orchestrator.webserverUrl}/api/v1/scenes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sceneData),
      });
      expect(res.status).toBe(403);
    });
  });

  describe("Disallowed Methods", () => {
    const url = `${orchestrator.webserverUrl}/api/v1/scenes`;

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
