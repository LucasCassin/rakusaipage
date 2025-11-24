import orchestrator from "tests/orchestrator.js";
import user from "models/user.js";
import session from "models/session.js";
import presentation from "models/presentation.js";
import scene from "models/scene.js";

describe("Test /api/v1/scenes/[id] routes", () => {
  let adminUser, alunoUser;
  let testPresentation, sceneToEdit, sceneToDelete;

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
      "update:scene", // A feature que estamos testando (PATCH)
      "delete:scene", // A feature que estamos testando (DELETE)
    ]);

    // 2. Criar Aluno (sem features)
    alunoUser = await user.create({
      username: "alunoSceneId",
      email: "alunosceneid@test.com",
      password: "StrongPassword123@",
    });
    alunoUser = await user.update({
      id: alunoUser.id,
      password: "StrongPassword123@",
    });

    // 3. Criar Apresentação e Cenas de teste
    testPresentation = await presentation.create(
      { name: "Show para Cenas ID" },
      adminUser.id,
    );
    sceneToEdit = await scene.create({
      presentation_id: testPresentation.id,
      name: "Cena para Editar",
      scene_type: "FORMATION",
      order: 1,
    });
    sceneToDelete = await scene.create({
      presentation_id: testPresentation.id,
      name: "Cena para Deletar",
      scene_type: "TRANSITION",
      order: 2,
    });
  });

  describe("PATCH /api/v1/scenes/[id]", () => {
    it("should allow an Admin (update:scene) to update a scene", async () => {
      const newSession = await session.create(adminUser);
      const patchData = {
        name: "Cena Foi Editada",
        order: 10,
        description: "Nova descrição",
      };

      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/scenes/${sceneToEdit.id}`,
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
      expect(resBody.name).toBe("Cena Foi Editada");
      expect(resBody.order).toBe(10);
      expect(resBody.description).toBe("Nova descrição");
    });

    it("should return 400 for invalid data (e.g., 'name' too short)", async () => {
      const newSession = await session.create(adminUser);
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/scenes/${sceneToEdit.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${newSession.token}`,
          },
          body: JSON.stringify({ name: "A" }), // Inválido
        },
      );
      expect(res.status).toBe(400); // Erro do validator.js
    });

    it("should return 404 for a non-existent scene ID", async () => {
      const newSession = await session.create(adminUser);
      const randomId = orchestrator.generateRandomUUIDV4();
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/scenes/${randomId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${newSession.token}`,
          },
          body: JSON.stringify({ name: "Fantasma" }),
        },
      );
      expect(res.status).toBe(404); // Erro do modelo scene.update
    });

    it("should return 403 for an Aluno (no 'update:scene' feature)", async () => {
      const newSession = await session.create(alunoUser);
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/scenes/${sceneToEdit.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${newSession.token}`,
          },
          body: JSON.stringify({ name: "Tentativa do Aluno" }),
        },
      );
      expect(res.status).toBe(403);
    });
  });

  describe("DELETE /api/v1/scenes/[id]", () => {
    it("should allow an Admin (delete:scene) to delete a scene", async () => {
      const newSession = await session.create(adminUser);
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/scenes/${sceneToDelete.id}`,
        {
          method: "DELETE",
          headers: { cookie: `session_id=${newSession.token}` },
        },
      );
      const resBody = await res.json();

      expect(res.status).toBe(200);
      expect(resBody.id).toBe(sceneToDelete.id);

      // Verificar se foi deletado (PATCH deve dar 404)
      const patchRes = await fetch(
        `${orchestrator.webserverUrl}/api/v1/scenes/${sceneToDelete.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${newSession.token}`,
          },
          body: JSON.stringify({ name: "Fantasma" }),
        },
      );
      expect(patchRes.status).toBe(404);
    });

    it("should return 404 when trying to delete a non-existent scene", async () => {
      const newSession = await session.create(adminUser);
      const randomId = orchestrator.generateRandomUUIDV4();
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/scenes/${randomId}`,
        {
          method: "DELETE",
          headers: { cookie: `session_id=${newSession.token}` },
        },
      );
      expect(res.status).toBe(404); // Erro do modelo scene.del
    });

    it("should return 403 for an Aluno (no 'delete:scene' feature)", async () => {
      const newSession = await session.create(alunoUser);
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/scenes/${sceneToEdit.id}`, // Tenta deletar a cena que sobrou
        {
          method: "DELETE",
          headers: { cookie: `session_id=${newSession.token}` },
        },
      );
      expect(res.status).toBe(403);
    });
  });

  describe("Disallowed Methods", () => {
    const url = `${orchestrator.webserverUrl}/api/v1/scenes/${orchestrator.generateRandomUUIDV4()}`;

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
