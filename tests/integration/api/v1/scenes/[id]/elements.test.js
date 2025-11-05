import orchestrator from "tests/orchestrator.js";
import user from "models/user.js";
import session from "models/session.js";
import presentation from "models/presentation.js";
import scene from "models/scene.js";
import elementType from "models/element_type.js";

describe("Test /api/v1/scenes/[id]/elements routes", () => {
  let adminUser, alunoUser, tocadorUser;
  let testPresentation, testScene, odaikoType;

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
      "create:scene", // Para criar a cena
      "create:element", // A feature que estamos testando
      "manage:element_types", // Para criar o tipo de elemento
    ]);

    // 2. Criar Aluno (sem features)
    alunoUser = await user.create({
      username: "alunoElement",
      email: "alunoelement@test.com",
      password: "StrongPassword123@",
    });
    alunoUser = await user.update({
      id: alunoUser.id,
      password: "StrongPassword123@",
    });

    // 3. Criar usuário para ser "atribuído"
    tocadorUser = await user.create({
      username: "tocadorElement",
      email: "tocadorelement@test.com",
      password: "StrongPassword123@",
    });

    // 4. Criar Apresentação, Cena e Tipo de Elemento
    testPresentation = await presentation.create(
      { name: "Show para Elementos" },
      adminUser.id,
    );
    testScene = await scene.create({
      presentation_id: testPresentation.id,
      name: "Cena de Formação",
      scene_type: "FORMATION",
      order: 1,
    });
    odaikoType = await elementType.create({
      name: "Odaiko",
      image_url: "/odaiko.svg",
    });
  });

  describe("POST /api/v1/scenes/[id]/elements", () => {
    it("should allow an Admin (create:element) to add an element to a scene", async () => {
      const newSession = await session.create(adminUser);
      const elementData = {
        element_type_id: odaikoType.id,
        position_x: 50.5,
        position_y: 75,
        display_name: "Renan",
        assigned_user_id: tocadorUser.id,
      };

      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/scenes/${testScene.id}/elements`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${newSession.token}`,
          },
          body: JSON.stringify(elementData),
        },
      );
      const resBody = await res.json();

      expect(res.status).toBe(201);
      expect(resBody.scene_id).toBe(testScene.id);
      expect(resBody.display_name).toBe("Renan");
      expect(resBody.position_x).toBe(50.5);
      expect(resBody.assigned_user_id).toBe(tocadorUser.id);
    });

    it("should return 400 for invalid data (missing 'position_x')", async () => {
      const newSession = await session.create(adminUser);
      const elementData = {
        element_type_id: odaikoType.id,
        // position_x está faltando
        position_y: 75,
      };

      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/scenes/${testScene.id}/elements`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${newSession.token}`,
          },
          body: JSON.stringify(elementData),
        },
      );
      expect(res.status).toBe(400); // Erro do validator.js
    });

    it("should return 404 for a non-existent scene ID", async () => {
      const newSession = await session.create(adminUser);
      const randomId = orchestrator.generateRandomUUIDV4();
      const elementData = {
        element_type_id: odaikoType.id,
        position_x: 50,
        position_y: 75,
      };

      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/scenes/${randomId}/elements`, // ID inválido
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${newSession.token}`,
          },
          body: JSON.stringify(elementData),
        },
      );

      // O modelo 'sceneElement.create' vai falhar no 'FOREIGN KEY constraint'
      // O 'database.js' deve capturar isso e retornar um erro apropriado (404 ou 400).
      expect(res.status).toBe(409); // Assumindo que o 'database.js' trata 'violates foreign key' como 404.
    });

    it("should return 403 for an Aluno (no 'create:element' feature)", async () => {
      const newSession = await session.create(alunoUser);
      const elementData = {
        element_type_id: odaikoType.id,
        position_x: 10,
        position_y: 10,
      };

      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/scenes/${testScene.id}/elements`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${newSession.token}`,
          },
          body: JSON.stringify(elementData),
        },
      );
      expect(res.status).toBe(403);
    });
  });

  describe("Disallowed Methods", () => {
    const url = `${orchestrator.webserverUrl}/api/v1/scenes/${orchestrator.generateRandomUUIDV4()}/elements`;

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
