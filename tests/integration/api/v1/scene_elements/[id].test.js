import orchestrator from "tests/orchestrator.js";
import user from "models/user.js";
import session from "models/session.js";
import presentation from "models/presentation.js";
import scene from "models/scene.js";
import elementType from "models/element_type.js";
import sceneElement from "models/scene_element.js";

describe("Test /api/v1/scene_elements/[id] routes", () => {
  let adminUser, alunoUser, tocadorUser;
  let testScene, odaikoType, elementToEdit, elementToDelete;

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
      "manage:element_types",
      "create:element",
      "update:element", // Feature para PATCH
      "delete:element", // Feature para DELETE
    ]);

    // 2. Criar Aluno (sem features)
    alunoUser = await user.create({
      username: "alunoElementId",
      email: "alunoelementid@test.com",
      password: "StrongPassword123@",
    });
    alunoUser = await user.update({
      id: alunoUser.id,
      password: "StrongPassword123@",
    });

    // 3. Criar usuário para ser "atribuído"
    tocadorUser = await user.create({
      username: "tocadorElementId",
      email: "tocadorelementid@test.com",
      password: "StrongPassword123@",
    });

    // 4. Criar Apresentação, Cena e Tipo
    const testPresentation = await presentation.create(
      { name: "Show para Elementos ID" },
      adminUser.id,
    );
    testScene = await scene.create({
      presentation_id: testPresentation.id,
      name: "Cena de Formação ID",
      scene_type: "FORMATION",
      order: 1,
    });
    odaikoType = await elementType.create({
      name: "Odaiko",
      image_url: "/odaiko.svg",
    });

    // 5. Criar elementos de teste
    elementToEdit = await sceneElement.create({
      scene_id: testScene.id,
      element_type_id: odaikoType.id,
      position_x: 10,
      position_y: 10,
      display_name: "Original",
    });
    elementToDelete = await sceneElement.create({
      scene_id: testScene.id,
      element_type_id: odaikoType.id,
      position_x: 20,
      position_y: 20,
      display_name: "Para Deletar",
    });
  });

  describe("PATCH /api/v1/scene_elements/[id]", () => {
    it("should allow an Admin (update:element) to update an element", async () => {
      const newSession = await session.create(adminUser);
      const patchData = {
        position_x: 11.5,
        position_y: 12.5,
        display_name: "Editado",
        assigned_user_id: tocadorUser.id,
      };

      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/scene_elements/${elementToEdit.id}`,
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
      expect(resBody.id).toBe(elementToEdit.id);
      expect(resBody.display_name).toBe("Editado");
      expect(resBody.position_x).toBe(11.5);
      expect(resBody.assigned_user_id).toBe(tocadorUser.id);
    });

    it("should return 400 for invalid data (e.g., 'position_y' out of bounds)", async () => {
      const newSession = await session.create(adminUser);
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/scene_elements/${elementToEdit.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${newSession.token}`,
          },
          body: JSON.stringify({ position_y: -10 }), // Inválido
        },
      );
      expect(res.status).toBe(400); // Erro do validator.js
    });

    it("should return 404 for a non-existent element ID", async () => {
      const newSession = await session.create(adminUser);
      const randomId = orchestrator.generateRandomUUIDV4();
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/scene_elements/${randomId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${newSession.token}`,
          },
          body: JSON.stringify({ display_name: "Fantasma" }),
        },
      );
      expect(res.status).toBe(404); // Erro do modelo sceneElement.update
    });

    it("should return 403 for an Aluno (no 'update:element' feature)", async () => {
      const newSession = await session.create(alunoUser);
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/scene_elements/${elementToEdit.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${newSession.token}`,
          },
          body: JSON.stringify({ display_name: "Tentativa do Aluno" }),
        },
      );
      expect(res.status).toBe(403);
    });
  });

  describe("DELETE /api/v1/scene_elements/[id]", () => {
    it("should allow an Admin (delete:element) to delete an element", async () => {
      const newSession = await session.create(adminUser);
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/scene_elements/${elementToDelete.id}`,
        {
          method: "DELETE",
          headers: { cookie: `session_id=${newSession.token}` },
        },
      );
      const resBody = await res.json();

      expect(res.status).toBe(200);
      expect(resBody.id).toBe(elementToDelete.id);

      // Verificar se foi deletado (PATCH deve dar 404)
      const patchRes = await fetch(
        `${orchestrator.webserverUrl}/api/v1/scene_elements/${elementToDelete.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${newSession.token}`,
          },
          body: JSON.stringify({ display_name: "Fantasma" }),
        },
      );
      expect(patchRes.status).toBe(404);
    });

    it("should return 404 when trying to delete a non-existent element", async () => {
      const newSession = await session.create(adminUser);
      const randomId = orchestrator.generateRandomUUIDV4();
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/scene_elements/${randomId}`,
        {
          method: "DELETE",
          headers: { cookie: `session_id=${newSession.token}` },
        },
      );
      expect(res.status).toBe(404); // Erro do modelo sceneElement.del
    });

    it("should return 403 for an Aluno (no 'delete:element' feature)", async () => {
      const newSession = await session.create(alunoUser);
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/scene_elements/${elementToEdit.id}`, // Tenta deletar o elemento que sobrou
        {
          method: "DELETE",
          headers: { cookie: `session_id=${newSession.token}` },
        },
      );
      expect(res.status).toBe(403);
    });
  });

  describe("Disallowed Methods", () => {
    const url = `${orchestrator.webserverUrl}/api/v1/scene_elements/${orchestrator.generateRandomUUIDV4()}`;

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
