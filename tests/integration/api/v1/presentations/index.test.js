import orchestrator from "tests/orchestrator.js";
import user from "models/user.js";
import session from "models/session.js";
import presentation from "models/presentation.js";
import presentationViewer from "models/presentation_viewer.js";
import { ValidationError } from "errors/index.js";

describe("GET & POST /api/v1/presentations", () => {
  let adminUser, adminSession;
  let regularUser, regularSession;
  let user2, user2Session;

  beforeAll(async () => {
    await orchestrator.waitForAllServices();
    await orchestrator.clearDatabase();
    await orchestrator.runPendingMigrations();

    // 1. Cria Admin
    adminUser = await user.findOneUser({ username: "mainUser" });
    adminUser = await user.update({
      id: adminUser.id,
      password: "StrongPassword123@",
    });
    adminSession = await session.create(adminUser);

    // 2. Cria Aluno 1
    regularUser = await user.create({
      username: "alunoPres1",
      email: "aluno1@test.com",
      password: "StrongPassword123@",
    });
    regularUser = await user.update({
      id: regularUser.id,
      password: "StrongPassword123@",
    });
    regularSession = await session.create(regularUser);

    // 3. Cria Aluno 2
    user2 = await user.create({
      username: "alunoPres2",
      email: "aluno2@test.com",
      password: "StrongPassword123@",
    });
    user2 = await user.update({
      id: user2.id,
      password: "StrongPassword123@",
    });
    user2Session = await session.create(user2);
  });

  describe("POST /api/v1/presentations", () => {
    // ... (Testes de POST permanecem os mesmos) ...
    it("should allow an admin to create a new presentation", async () => {
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/presentations`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${adminSession.token}`,
          },
          body: JSON.stringify({
            name: "Show de Admin",
            location: "Suzano",
            is_public: true,
          }),
        },
      );
      const resBody = await res.json();

      expect(res.status).toBe(201);
      expect(resBody.name).toBe("Show de Admin");
    });

    it("should return 403 (Forbidden) for a regular user", async () => {
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/presentations`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${regularSession.token}`,
          },
          body: JSON.stringify({ name: "Show Falho" }),
        },
      );
      expect(res.status).toBe(403);
    });

    it("should return 400 (Bad Request) for invalid data", async () => {
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/presentations`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${adminSession.token}`,
          },
          body: JSON.stringify({ location: "Sem nome" }),
        },
      );
      expect(res.status).toBe(400);
    });

    it("should return 401 (Unauthorized) for an anonymous user", async () => {
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/presentations`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "Show Anônimo" }),
        },
      );
      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/v1/presentations", () => {
    beforeAll(async () => {
      // Cria dados para o GET
      await presentation.create({ name: "Show do Aluno 1" }, regularUser.id);
      await presentation.create({ name: "Show do Admin" }, adminUser.id);
      const sharedPres = await presentation.create(
        { name: "Show Compartilhado" },
        adminUser.id,
      );
      await presentationViewer.addViewer(sharedPres.id, regularUser.id);
    });

    it("should allow a user to list only presentations they created or are a viewer of", async () => {
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/presentations`,
        {
          headers: { cookie: `session_id=${regularSession.token}` },
        },
      );
      const resBody = await res.json();

      // Agora deve passar, pois o 403 foi corrigido
      expect(res.status).toBe(200);
      expect(resBody).toHaveLength(2);
      expect(resBody.map((p) => p.name)).toEqual(
        expect.arrayContaining(["Show do Aluno 1", "Show Compartilhado"]),
      );
    });

    it("should return an empty array for a user with no presentations", async () => {
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/presentations`,
        {
          headers: { cookie: `session_id=${user2Session.token}` },
        },
      );
      const resBody = await res.json();

      // Agora deve passar, pois o 403 foi corrigido
      expect(res.status).toBe(200);
      expect(resBody).toHaveLength(0);
    });

    it("should return 401 (Unauthorized) for an anonymous user", async () => {
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/presentations`,
      );
      expect(res.status).toBe(401);
    });
  });

  // --- O NOVO TESTE QUE FALTAVA ---
  describe("PUT /api/v1/presentations", () => {
    it("should return 405 Method Not Allowed", async () => {
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/presentations`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "Metodo errado" }),
        },
      );
      expect(res.status).toBe(405);
    });
  });
  // --- FIM DO NOVO TESTE ---
});
