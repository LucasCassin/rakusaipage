import orchestrator from "tests/orchestrator.js";
import user from "models/user.js";
import session from "models/session.js";
import presentation from "models/presentation.js";
import presentationViewer from "models/presentation_viewer.js";

describe("Test /api/v1/presentations/[id]/viewers/[userId] routes", () => {
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
      password: "StrongPassword123@", // Senha de admin
    });
    adminUser = await user.addFeatures(adminUser, [
      "create:presentation", // Para criar a apresentação
      "create:viewer", // Para adicionar o aluno ao elenco
      "delete:viewer", // A feature que estamos testando
    ]);

    // 2. Criar Aluno (sem features)
    alunoUser = await user.create({
      username: "alunoViewerDelete",
      email: "alunodelete@test.com",
      password: "StrongPassword123@",
    });
    alunoUser = await user.update({
      id: alunoUser.id,
      password: "StrongPassword123@",
    });

    // 3. Criar Aluno que será adicionado/removido
    alunoParaElenco = await user.create({
      username: "alunoDoElenco",
      email: "elenco@test.com",
      password: "StrongPassword123@",
    });

    // 4. Criar a Apresentação e Adicionar o Aluno
    testPresentation = await presentation.create(
      { name: "Show de Remoção do Elenco" },
      adminUser.id,
    );
    await presentationViewer.addViewer(testPresentation.id, alunoParaElenco.id);
  });

  describe("DELETE /api/v1/presentations/[id]/viewers/[userId]", () => {
    it("should allow an Admin (delete:viewer) to remove a user from the cast and return 200", async () => {
      const newSession = await session.create(adminUser);
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/presentations/${testPresentation.id}/viewers/${alunoParaElenco.id}`,
        {
          method: "DELETE",
          headers: { cookie: `session_id=${newSession.token}` },
        },
      );
      const resBody = await res.json();

      expect(res.status).toBe(200);
      expect(resBody.id).toBeDefined(); // O 'removeViewer' retorna o ID da entrada deletada

      // Verificar se foi realmente deletado
      const viewers = await presentationViewer.findByPresentationId(
        testPresentation.id,
      );
      expect(viewers).toHaveLength(0);
    });

    it("should return 404 if the user is not in the cast (or already removed)", async () => {
      const newSession = await session.create(adminUser);
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/presentations/${testPresentation.id}/viewers/${alunoParaElenco.id}`, // Deletando de novo
        {
          method: "DELETE",
          headers: { cookie: `session_id=${newSession.token}` },
        },
      );
      // O 'removeViewer' lança NotFoundError,
      // que o handler/viewers/[userId].js` (refactored)] converte para 404.
      expect(res.status).toBe(404);
    });

    it("should return 403 for an Aluno (no 'delete:viewer' feature)", async () => {
      // Adicionar o usuário de volta para este teste
      await presentationViewer.addViewer(
        testPresentation.id,
        alunoParaElenco.id,
      );

      const newSession = await session.create(alunoUser); // Sessão do Aluno
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/presentations/${testPresentation.id}/viewers/${alunoParaElenco.id}`,
        {
          method: "DELETE",
          headers: { cookie: `session_id=${newSession.token}` },
        },
      );
      expect(res.status).toBe(403); // O aluno não tem a "chave"
    });

    it("should return 403 for an Anonymous user", async () => {
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/presentations/${testPresentation.id}/viewers/${alunoParaElenco.id}`,
        {
          method: "DELETE",
        },
      );
      expect(res.status).toBe(403);
    });
  });

  describe("Disallowed Methods", () => {
    const url = `${orchestrator.webserverUrl}/api/v1/presentations/${orchestrator.generateRandomUUIDV4()}/viewers/${orchestrator.generateRandomUUIDV4()}`;

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

    it("should return 405 for PATCH", async () => {
      const res = await fetch(url, { method: "PATCH" });
      expect(res.status).toBe(405);
    });
  });
});
