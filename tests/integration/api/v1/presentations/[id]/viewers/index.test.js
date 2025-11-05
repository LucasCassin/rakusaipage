import orchestrator from "tests/orchestrator.js";
import user from "models/user.js";
import session from "models/session.js";
import presentation from "models/presentation.js";

describe("Test /api/v1/presentations/[id]/viewers routes", () => {
  let adminUser, alunoUser, alunoParaElenco;
  let testPresentation;

  beforeAll(async () => {
    await orchestrator.waitForAllServices();
    await orchestrator.clearDatabase();
    await orchestrator.runPendingMigrations();

    // 1. Criar Admin, atualizar senha e dar features
    adminUser = await user.findOneUser({ username: "mainUser" });
    adminUser = await user.update({
      id: adminUser.id,
      password: "StrongPassword123@",
    });
    adminUser = await user.addFeatures(adminUser, [
      "create:presentation", // Para criar a apresentação
      "create:viewer",
      "read:viewer",
    ]);

    // 2. Criar Aluno (sem features)
    alunoUser = await user.create({
      username: "alunoViewers",
      email: "alunoviewers@test.com",
      password: "StrongPassword123@",
    });
    alunoUser = await user.update({
      id: alunoUser.id,
      password: "StrongPassword123@",
    });

    // 3. Criar Aluno que será adicionado ao elenco
    alunoParaElenco = await user.create({
      username: "alunoDoElenco",
      email: "elenco@test.com",
      password: "StrongPassword123@",
    });

    // 4. Criar a Apresentação
    testPresentation = await presentation.create(
      { name: "Show do Elenco" },
      adminUser.id,
    );
  });

  describe("POST /api/v1/presentations/[id]/viewers", () => {
    it("should allow an Admin (create:viewer) to add a user to the cast (elenco) and return 201", async () => {
      const newSession = await session.create(adminUser);
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/presentations/${testPresentation.id}/viewers`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${newSession.token}`,
          },
          body: JSON.stringify({ user_id: alunoParaElenco.id }),
        },
      );
      const resBody = await res.json();

      expect(res.status).toBe(201);
      expect(resBody.user_id).toBe(alunoParaElenco.id);
      expect(resBody.presentation_id).toBe(testPresentation.id);
    });

    it("should return 200 (OK) if the user is already in the cast", async () => {
      const newSession = await session.create(adminUser);
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/presentations/${testPresentation.id}/viewers`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${newSession.token}`,
          },
          body: JSON.stringify({ user_id: alunoParaElenco.id }), // Enviando de novo
        },
      );
      const resBody = await res.json();

      // A rota refatorada retorna 200 com uma mensagem/viewers/index.js` (refactored)]
      expect(res.status).toBe(200);
      expect(resBody.message).toBe("Usuário já estava no elenco.");
    });

    it("should return 400 for invalid data (missing 'user_id')", async () => {
      const newSession = await session.create(adminUser);
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/presentations/${testPresentation.id}/viewers`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${newSession.token}`,
          },
          body: JSON.stringify({}), // Body vazio
        },
      );
      expect(res.status).toBe(400);
    });

    it("should return 403 for an Aluno (no 'create:viewer' feature)", async () => {
      const newSession = await session.create(alunoUser);
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/presentations/${testPresentation.id}/viewers`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${newSession.token}`,
          },
          body: JSON.stringify({ user_id: alunoUser.id }),
        },
      );
      expect(res.status).toBe(403);
    });
  });

  describe("GET /api/v1/presentations/[id]/viewers", () => {
    it("should allow an Admin (read:viewer) to GET the cast list", async () => {
      const newSession = await session.create(adminUser);
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/presentations/${testPresentation.id}/viewers`,
        {
          headers: { cookie: `session_id=${newSession.token}` },
        },
      );
      const resBody = await res.json();

      expect(res.status).toBe(200);
      expect(Array.isArray(resBody)).toBe(true);
      // Deve ter 1 usuário, o "alunoParaElenco" adicionado no teste POST
      expect(resBody).toHaveLength(1);
      expect(resBody[0].id).toBe(alunoParaElenco.id);
      expect(resBody[0].username).toBe("alunoDoElenco");
    });

    it("should return 403 for an Aluno (no 'read:viewer' feature)", async () => {
      const newSession = await session.create(alunoUser);
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/presentations/${testPresentation.id}/viewers`,
        {
          headers: { cookie: `session_id=${newSession.token}` },
        },
      );
      expect(res.status).toBe(403);
    });

    it("should return 403 for an Anonymous user", async () => {
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/presentations/${testPresentation.id}/viewers`,
      );
      expect(res.status).toBe(403);
    });
  });

  describe("Disallowed Methods", () => {
    const url = `${orchestrator.webserverUrl}/api/v1/presentations/${orchestrator.generateRandomUUIDV4()}/viewers`;

    it("should return 405 for PUT", async () => {
      const res = await fetch(url, { method: "PUT" });
      expect(res.status).toBe(405);
    });

    it("should return 405 for PATCH", async () => {
      const res = await fetch(url, { method: "PATCH" });
      expect(res.status).toBe(405);
    });

    // O método DELETE é permitido, mas em /api/v1/presentations/[id]/viewers/[userId]
    it("should return 405 for DELETE on the index route", async () => {
      const res = await fetch(url, { method: "DELETE" });
      expect(res.status).toBe(405);
    });
  });
});
