import orchestrator from "tests/orchestrator.js";
import user from "models/user.js";
import session from "models/session.js";
import presentation from "models/presentation.js";
import scene from "models/scene.js";
import elementType from "models/element_type.js";
import sceneElement from "models/scene_element.js";

describe("Test /api/v1/presentations/[id]/element-names routes", () => {
  let adminUser, alunoUser, tocadorUser;
  let odaikoType, testPresentation;

  beforeAll(async () => {
    await orchestrator.waitForAllServices();
    await orchestrator.clearDatabase();
    await orchestrator.runPendingMigrations();

    // 1. Criar Admin, atualizar senha e dar feature
    adminUser = await user.findOneUser({ username: "mainUser" });
    adminUser = await user.update({
      id: adminUser.id,
      password: "StrongPassword123@",
    });
    adminUser = await user.addFeatures(adminUser, ["update:presentation"]);

    // 2. Criar Aluno e atualizar senha (sem feature)
    alunoUser = await user.create({
      username: "alunoGlobalEdit",
      email: "alunoglobal@test.com",
      password: "StrongPassword123@",
    });
    alunoUser = await user.update({
      id: alunoUser.id,
      password: "StrongPassword123@",
    });

    // 3. Criar usuário para ser "atribuído"
    tocadorUser = await user.create({
      username: "tocadorOriginal",
      email: "tocador@test.com",
      password: "StrongPassword123@",
    });

    // 4. Criar Tipos de Elementos
    odaikoType = await elementType.create({
      name: "Odaiko5",
      image_url: "/odaiko.svg",
      scale: 1.0,
    });

    // 5. Setup da Apresentação (baseado no seu 'presentation.test.js')
    testPresentation = await presentation.create(
      { name: "Show da Edição Global" },
      adminUser.id,
    );
    const scene1 = await scene.create({
      presentation_id: testPresentation.id,
      name: "Musica 1",
      scene_type: "FORMATION",
      order: 1,
    });
    const scene2 = await scene.create({
      presentation_id: testPresentation.id,
      name: "Musica 2",
      scene_type: "FORMATION",
      order: 2,
    });

    // 6. Criar os elementos "duplicados" que serão editados
    const elementData = {
      scene_id: scene1.id,
      element_type_id: odaikoType.id,
      position_x: 10,
      position_y: 10,
      display_name: "Trocador",
      assigned_user_id: tocadorUser.id,
    };
    await sceneElement.create(elementData); // Elemento na Cena 1
    await sceneElement.create({
      ...elementData,
      scene_id: scene2.id, // Elemento na Cena 2
      position_x: 20,
    });
  });

  describe("PATCH /api/v1/presentations/[id]/element-names", () => {
    it("should allow an Admin (update:presentation) to update names globally and return 200", async () => {
      const newSession = await session.create(adminUser);
      const updateData = {
        element_type_id: odaikoType.id, // O tipo de elemento
        old_display_name: "Trocador", // O nome antigo
        new_display_name: "Nome Global Editado", // O nome novo
        new_assigned_user_id: adminUser.id, // O novo usuário atribuído
      };

      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/presentations/${testPresentation.id}/element-names`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${newSession.token}`,
          },
          body: JSON.stringify(updateData),
        },
      );
      const resBody = await res.json();

      expect(res.status).toBe(200);
      // Deve ter atualizado os 2 elementos criados no beforeAll
      expect(resBody).toEqual({ updatedCount: 2 });
    });

    it("should return 400 for invalid data (missing 'new_display_name')", async () => {
      const newSession = await session.create(adminUser);
      const updateData = {
        element_type_id: odaikoType.id,
        old_display_name: "Trocador",
        // new_display_name está faltando
      };

      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/presentations/${testPresentation.id}/element-names`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${newSession.token}`,
          },
          body: JSON.stringify(updateData),
        },
      );
      expect(res.status).toBe(400);
    });

    it("should return 403 for an Aluno (no feature)", async () => {
      const newSession = await session.create(alunoUser);
      const updateData = {
        element_type_id: odaikoType.id,
        old_display_name: "Trocador",
        new_display_name: "Falha",
      };

      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/presentations/${testPresentation.id}/element-names`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${newSession.token}`,
          },
          body: JSON.stringify(updateData),
        },
      );
      expect(res.status).toBe(403);
    });

    it("should return 403 for an Anonymous user", async () => {
      const updateData = {
        element_type_id: odaikoType.id,
        old_display_name: "Trocador",
        new_display_name: "Falha Anonima",
      };

      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/presentations/${testPresentation.id}/element-names`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updateData),
        },
      );
      expect(res.status).toBe(403);
    });
  });

  describe("Disallowed Methods", () => {
    const url = `${orchestrator.webserverUrl}/api/v1/presentations/${orchestrator.generateRandomUUIDV4()}/element-names`;

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

    it("should return 405 for DELETE", async () => {
      const res = await fetch(url, { method: "DELETE" });
      expect(res.status).toBe(405);
    });
  });
});
