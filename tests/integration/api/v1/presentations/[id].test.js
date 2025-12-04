import orchestrator from "tests/orchestrator.js";
import user from "models/user.js";
import session from "models/session.js";
import presentation from "models/presentation.js";
import presentationViewer from "models/presentation_viewer.js";

describe("Test /api/v1/presentations/[id] routes", () => {
  let adminUser, alunoUser;
  let presAdmin, presPublica, presPrivadaElenco, presInativa;

  beforeAll(async () => {
    await orchestrator.waitForAllServices();
    await orchestrator.clearDatabase();
    await orchestrator.runPendingMigrations();

    // 1. Criar Admin, atualizar senha e dar features de escrita/admin
    adminUser = await user.findOneUser({ username: "mainUser" });
    adminUser = await user.update({
      id: adminUser.id,
      password: "StrongPassword123@", // Senha de admin
    });
    adminUser = await user.addFeatures(adminUser, [
      "read:presentation:admin", // Chave mestra de leitura
      "update:presentation",
      "delete:presentation",
      "create:viewer", // Necessário para adicionar aluno ao elenco
    ]);

    // 2. Criar Aluno (padrão) e atualizar senha
    alunoUser = await user.create({
      username: "alunoLeitor",
      email: "alunoleitor@test.com",
      password: "StrongPassword123@",
    });
    alunoUser = await user.update({
      id: alunoUser.id,
      password: "StrongPassword123@",
    });
    // alunoUser já tem "read:presentation" por padrão (DEFAULT_FEATURES)

    // 3. Criar apresentações de teste
    // Admin cria todas para testar a lógica de "não-dono"
    presAdmin = await presentation.create(
      { name: "Show Privado do Admin", is_active: true },
      adminUser.id,
    );
    presPublica = await presentation.create(
      { name: "Show Público", is_public: true, is_active: true },
      adminUser.id,
    );
    presPrivadaElenco = await presentation.create(
      { name: "Show Privado (Aluno no Elenco)", is_active: true },
      adminUser.id,
    );
    presInativa = await presentation.create(
      { name: "Show Inativo", is_active: false },
      adminUser.id,
    );

    // Adicionar "alunoUser" ao elenco da apresentação privada
    await presentationViewer.addViewer(presPrivadaElenco.id, alunoUser.id);
    await presentationViewer.addViewer(presInativa.id, alunoUser.id);
  });

  describe("GET /api/v1/presentations/[id]", () => {
    // Testes de Admin (Chave Mestra)
    it("should allow an Admin (read:presentation:admin) to GET any private presentation", async () => {
      const newSession = await session.create(adminUser);
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/presentations/${presPrivadaElenco.id}`, // Acessando a apresentação do elenco
        {
          headers: { cookie: `session_id=${newSession.token}` },
        },
      );
      const resBody = await res.json();
      expect(res.status).toBe(200);
      expect(resBody.name).toBe("Show Privado (Aluno no Elenco)");
      expect(resBody.created_by_user_id).toBe(adminUser.id); // Admin vê todos os campos
    });

    it("should allow an Admin (read:presentation:admin) to GET any private presentation and inactive", async () => {
      const newSession = await session.create(adminUser);
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/presentations/${presInativa.id}`, // Acessando a apresentação do elenco
        {
          headers: { cookie: `session_id=${newSession.token}` },
        },
      );
      const resBody = await res.json();
      expect(res.status).toBe(200);
      expect(resBody.name).toBe(presInativa.name);
      expect(resBody.created_by_user_id).toBe(adminUser.id); // Admin vê todos os campos
    });

    // Testes de Aluno (Chave Padrão)
    it("should allow an Aluno (in elenco) to GET a private presentation", async () => {
      const newSession = await session.create(alunoUser);
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/presentations/${presPrivadaElenco.id}`,
        {
          headers: { cookie: `session_id=${newSession.token}` },
        },
      );
      const resBody = await res.json();
      expect(res.status).toBe(200);
      expect(resBody.name).toBe("Show Privado (Aluno no Elenco)");
      expect(resBody.created_by_user_id).toBeUndefined(); // Aluno não vê PII
    });

    it("should allow an Aluno (not in elenco) to GET a public presentation", async () => {
      const newSession = await session.create(alunoUser);
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/presentations/${presPublica.id}`,
        {
          headers: { cookie: `session_id=${newSession.token}` },
        },
      );
      expect(res.status).toBe(200);
    });

    it("should return 403 for an Aluno (not in elenco) trying to GET a private presentation", async () => {
      const newSession = await session.create(alunoUser);
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/presentations/${presAdmin.id}`, // Tentando acessar o show privado do admin
        {
          headers: { cookie: `session_id=${newSession.token}` },
        },
      );
      // 403 (Forbidden) pois ele está logado mas não tem permissão
      expect(res.status).toBe(403);
    });

    it("should return 403 for an Aluno (in elenco, but inactive presentation) trying to GET a private presentation", async () => {
      const newSession = await session.create(alunoUser);
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/presentations/${presInativa.id}`, // Tentando acessar o show privado do admin
        {
          headers: { cookie: `session_id=${newSession.token}` },
        },
      );
      // 403 (Forbidden) pois ele está logado mas não tem permissão
      expect(res.status).toBe(403);
    });

    // Testes de Anônimo (Chave Padrão)
    it("should allow an Anonymous user to GET a public presentation", async () => {
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/presentations/${presPublica.id}`,
      );
      expect(res.status).toBe(200);
    });

    it("should return 401 for an Anonymous user trying to GET a private presentation", async () => {
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/presentations/${presAdmin.id}`,
      );
      // 401 (Unauthorized) pois ele não está logado, e esta rota é privada
      expect(res.status).toBe(401);
    });

    // Teste de Erro
    it("should return 404 for a non-existent ID", async () => {
      const newSession = await session.create(adminUser);
      const randomId = orchestrator.generateRandomUUIDV4();
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/presentations/${randomId}`,
        {
          headers: { cookie: `session_id=${newSession.token}` },
        },
      );
      expect(res.status).toBe(404);
    });
  });

  describe("PATCH /api/v1/presentations/[id]", () => {
    it("should allow an Admin (update:presentation) to PATCH any presentation", async () => {
      const newSession = await session.create(adminUser);
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/presentations/${presPublica.id}`, // Editando a pública
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${newSession.token}`,
          },
          body: JSON.stringify({ name: "Show Público (Editado)" }),
        },
      );
      const resBody = await res.json();
      expect(res.status).toBe(200);
      expect(resBody.name).toBe("Show Público (Editado)");
    });

    it("should return 400 for invalid data (e.g., 'name' too short)", async () => {
      const newSession = await session.create(adminUser);
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/presentations/${presPublica.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${newSession.token}`,
          },
          body: JSON.stringify({ name: "A" }), // Inválido
        },
      );
      expect(res.status).toBe(400);
    });

    it("should return 403 for an Aluno (no feature) trying to PATCH", async () => {
      const newSession = await session.create(alunoUser);
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/presentations/${presPublica.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${newSession.token}`,
          },
          body: JSON.stringify({ name: "Falha" }),
        },
      );
      expect(res.status).toBe(403);
    });
  });

  describe("DELETE /api/v1/presentations/[id]", () => {
    it("should allow an Admin (delete:presentation) to DELETE any presentation", async () => {
      // Criar uma apresentação só para este teste
      const presToDelete = await presentation.create(
        { name: "Show para Deletar" },
        adminUser.id,
      );
      const newSession = await session.create(adminUser);
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/presentations/${presToDelete.id}`,
        {
          method: "DELETE",
          headers: { cookie: `session_id=${newSession.token}` },
        },
      );
      expect(res.status).toBe(200);

      // Verificar se foi deletado (GET deve dar 404)
      const getRes = await fetch(
        `${orchestrator.webserverUrl}/api/v1/presentations/${presToDelete.id}`,
        {
          headers: { cookie: `session_id=${newSession.token}` },
        },
      );
      expect(getRes.status).toBe(404);
    });

    it("should return 403 for an Aluno (no feature) trying to DELETE", async () => {
      const newSession = await session.create(alunoUser);
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/presentations/${presPublica.id}`,
        {
          method: "DELETE",
          headers: { cookie: `session_id=${newSession.token}` },
        },
      );
      expect(res.status).toBe(403);
    });
  });

  describe("Disallowed Methods", () => {
    it("should return 405 Method Not Allowed for POST", async () => {
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/presentations/${presPublica.id}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "fail" }),
        },
      );
      expect(res.status).toBe(405);
    });

    it("should return 405 Method Not Allowed for PUT", async () => {
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/presentations/${presPublica.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "fail" }),
        },
      );
      expect(res.status).toBe(405);
    });
  });
});
