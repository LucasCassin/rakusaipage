import orchestrator from "tests/orchestrator.js";
import user from "models/user.js";
import session from "models/session.js";
import presentation from "models/presentation.js";
import presentationViewer from "models/presentation_viewer.js";

describe("Test /api/v1/presentations routes", () => {
  let adminUser, alunoUser;

  beforeAll(async () => {
    await orchestrator.waitForAllServices();
    await orchestrator.clearDatabase();
    await orchestrator.runPendingMigrations();

    // Criar o Admin e atualizar sua senha
    adminUser = await user.findOneUser({ username: "mainUser" });
    adminUser = await user.update({
      id: adminUser.id,
      password: "StrongPassword123@", // Como solicitado
    });

    // Dar ao Admin as "chaves" de escrita que criamos na refatoração
    adminUser = await user.addFeatures(adminUser, [
      "create:presentation",
      "read:presentation:admin",
    ]);

    // Criar o Aluno e atualizar sua senha
    alunoUser = await user.create({
      username: "alunoPresentations",
      email: "aluno@test.com",
      password: "StrongPassword123@",
    });
    alunoUser = await user.update({
      id: alunoUser.id,
      password: "StrongPassword123@", // Como solicitado
    });
    // O alunoUser já tem "read:presentation" das DEFAULT_FEATURES
  });

  describe("POST /api/v1/presentations", () => {
    it("should allow an Admin to create a new presentation and return 201", async () => {
      const newSession = await session.create(adminUser);
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/presentations`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${newSession.token}`,
          },
          body: JSON.stringify({
            name: "Show de Teste (Admin)",
            is_public: false,
            is_active: true,
          }),
        },
      );
      const resBody = await res.json();
      expect(res.status).toBe(201);
      expect(resBody.name).toBe("Show de Teste (Admin)");
      expect(resBody.is_active).toBe(true);
      expect(resBody.created_by_user_id).toBe(adminUser.id);
    });

    it("should return 400 for an Admin if 'name' is missing", async () => {
      const newSession = await session.create(adminUser);
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/presentations`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${newSession.token}`,
          },
          body: JSON.stringify({ is_public: true }), // Sem 'name'
        },
      );
      expect(res.status).toBe(400);
    });

    it("should return 403 for an Aluno (regular user)", async () => {
      const newSession = await session.create(alunoUser);
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/presentations`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${newSession.token}`,
          },
          body: JSON.stringify({ name: "Show do Aluno (Falha)" }),
        },
      );
      // O Aluno não tem a feature "create:presentation"
      expect(res.status).toBe(403);
    });

    it("should return 403 for an Anonymous user", async () => {
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/presentations`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "Show Anônimo (Falha)" }),
        },
      );
      expect(res.status).toBe(403);
    });
  });

  describe("GET /api/v1/presentations", () => {
    let presAluno, presShared;

    beforeAll(async () => {
      // O "Show de Teste (Admin)" já foi criado pelo teste POST
      // Criar apresentações adicionais para testar a lógica de listagem
      presAluno = await presentation.create(
        { name: "Show Pessoal do Aluno" },
        alunoUser.id,
      );
      presShared = await presentation.create(
        { name: "Show Compartilhado" },
        adminUser.id,
      );
      // Adiciona o aluno ao elenco do show compartilhado
      await presentationViewer.addViewer(presShared.id, alunoUser.id);
    });

    it("should return only the user's presentations (owned or in cast) for an Aluno", async () => {
      const newSession = await session.create(alunoUser);
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/presentations`,
        {
          headers: { cookie: `session_id=${newSession.token}` },
        },
      );
      const resBody = await res.json();

      expect(res.status).toBe(200);
      expect(Array.isArray(resBody)).toBe(true);
      // O aluno deve ver 2: a que ele criou e a que ele está no elenco
      expect(resBody).toHaveLength(2);
      expect(resBody.map((p) => p.name)).toContain("Show Pessoal do Aluno");
      expect(resBody.map((p) => p.name)).toContain("Show Compartilhado");
    });

    it("should return all presentations the Admin owns or is in cast for", async () => {
      const newSession = await session.create(adminUser);
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/presentations`,
        {
          headers: { cookie: `session_id=${newSession.token}` },
        },
      );
      const resBody = await res.json();
      expect(res.status).toBe(200);
      // O admin deve ver 2: a que ele criou no POST e a que ele criou no beforeAll
      expect(resBody).toHaveLength(2);
      expect(resBody.map((p) => p.name)).toContain("Show de Teste (Admin)");
      expect(resBody.map((p) => p.name)).toContain("Show Compartilhado");
    });

    it("should return 401 for an Anonymous user (must be logged in)", async () => {
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/presentations`,
      );
      // A rota (refatorada) exige login para listar, mesmo que a lista venha vazia
      expect(res.status).toBe(401);
    });
  });

  describe("Disallowed Methods", () => {
    it("should return 405 Method Not Allowed for PUT", async () => {
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/presentations`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "fail" }),
        },
      );
      expect(res.status).toBe(405);
    });

    it("should return 405 Method Not Allowed for PATCH", async () => {
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/presentations`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "fail" }),
        },
      );
      expect(res.status).toBe(405);
    });

    it("should return 405 Method Not Allowed for DELETE", async () => {
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/presentations`,
        { method: "DELETE" },
      );
      expect(res.status).toBe(405);
    });
  });
});
