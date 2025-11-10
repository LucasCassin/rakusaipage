import orchestrator from "tests/orchestrator.js";
import user from "models/user.js";
import session from "models/session.js";
import presentation from "models/presentation.js";
import scene from "models/scene.js";
import elementType from "models/element_type.js";
import sceneElement from "models/scene_element.js"; // Usamos para criar elementos
import database from "infra/database";

describe("Test /api/v1/scene_elements/[id] routes", () => {
  let adminUser, adminSession, alunoUser, tocadorUser;
  let testScene, odaikoType;
  let elementToTest; // O elemento principal (scene_element)

  beforeAll(async () => {
    await orchestrator.waitForAllServices();
    await orchestrator.clearDatabase();
    await orchestrator.runPendingMigrations();

    // 1. Criar usuários e sessão admin
    adminUser = await user.findOneUser({ username: "mainUser" });
    adminUser = await user.update({
      id: adminUser.id,
      password: "StrongPassword123@",
    });
    adminUser = await user.addFeatures(adminUser, [
      "create:presentation",
      "create:scene",
      "create:element",
      "manage:element_types",
    ]);
    adminSession = await session.create(adminUser);

    alunoUser = await user.create({
      username: "alunoElement",
      email: "alunoelement@test.com",
      password: "StrongPassword123@",
    });
    tocadorUser = await user.create({
      username: "tocadorElement",
      email: "tocadorelement@test.com",
      password: "StrongPassword123@",
    });

    // 2. Criar infra
    const testPresentation = await presentation.create(
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

  // Criamos um novo elemento ANTES de cada teste
  beforeEach(async () => {
    elementToTest = await sceneElement.create({
      scene_id: testScene.id,
      element_type_id: odaikoType.id,
      position_x: 10,
      position_y: 10,
      display_name: "Elemento Original",
      assigned_user_id: tocadorUser.id,
    });
  });

  // Limpamos os elementos DEPOIS de cada teste
  afterEach(async () => {
    await database.query("DELETE FROM scene_elements;");
    await database.query("DELETE FROM element_groups;");
  });

  // --- GET ---
  describe("GET /api/v1/scene_elements/[id]", () => {
    it("should get the element and its group data (JOIN)", async () => {
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/scene_elements/${elementToTest.id}`,
        {
          method: "GET",
          headers: { cookie: `session_id=${adminSession.token}` },
        },
      );
      const resBody = await res.json();

      expect(res.status).toBe(200);
      expect(resBody.id).toBe(elementToTest.id);
      expect(resBody.position_x).toBe(10);
      expect(resBody.group_id).toBe(elementToTest.group_id);
      // Foco em Testes: Validando o JOIN da 'findById' refatorada
      expect(resBody.display_name).toBe("Elemento Original");
      expect(resBody.assigned_user_id).toBe(tocadorUser.id);
    });
  });

  // --- (REFATORADO) PATCH ---
  describe("PATCH /api/v1/scene_elements/[id]", () => {
    it("should update element position and group name in one transaction", async () => {
      const updateData = {
        position_x: 99.9, // Atualiza scene_elements
        display_name: "Nome Atualizado", // Atualiza element_groups
      };

      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/scene_elements/${elementToTest.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${adminSession.token}`,
          },
          body: JSON.stringify(updateData),
        },
      );
      const resBody = await res.json();

      // 1. Validar o 'scene_element' retornado
      expect(res.status).toBe(200);
      expect(resBody.position_x).toBe(99.9); // Posição atualizada
      expect(resBody.position_y).toBe(10); // Posição antiga mantida

      // 2. Foco em Testes: Validar a transação (checar o 'element_group' no banco)
      const groupRes = await database.query({
        text: `SELECT display_name FROM element_groups WHERE id = $1`,
        values: [elementToTest.group_id],
      });
      expect(groupRes.rows[0].display_name).toBe("Nome Atualizado");
    });
  });

  // --- (REFATORADO) DELETE ---
  describe("DELETE /api/v1/scene_elements/[id]", () => {
    it("should delete the element AND its group (if orphan)", async () => {
      const groupId = elementToTest.group_id;

      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/scene_elements/${elementToTest.id}`,
        {
          method: "DELETE",
          headers: { cookie: `session_id=${adminSession.token}` },
        },
      );
      expect(res.status).toBe(200);

      // 1. Validar que o elemento foi deletado
      const elRes = await database.query({
        text: `SELECT COUNT(*) FROM scene_elements WHERE id = $1`,
        values: [elementToTest.id],
      });
      expect(elRes.rows[0].count).toBe("0");

      // 2. Foco em Testes: Validar que o grupo órfão foi deletado
      const groupRes = await database.query({
        text: `SELECT COUNT(*) FROM element_groups WHERE id = $1`,
        values: [groupId],
      });
      expect(groupRes.rows[0].count).toBe("0");
    });

    it("should delete the element but NOT the group (if not orphan)", async () => {
      const groupId = elementToTest.group_id;

      // 2. Criar um segundo elemento (elementB) no MESMO grupo
      await database.query({
        text: `INSERT INTO scene_elements (scene_id, element_type_id, group_id, position_x, position_y)
               VALUES ($1, $2, $3, 40, 40)`,
        values: [testScene.id, odaikoType.id, groupId],
      });

      // 3. Deletar o primeiro elemento (elementToTest)
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/scene_elements/${elementToTest.id}`,
        {
          method: "DELETE",
          headers: { cookie: `session_id=${adminSession.token}` },
        },
      );
      expect(res.status).toBe(200);

      // 4. Foco em Testes: Validar que o grupo NÃO foi deletado
      const groupRes = await database.query({
        text: `SELECT COUNT(*) FROM element_groups WHERE id = $1`,
        values: [groupId],
      });
      expect(groupRes.rows[0].count).toBe("1");
    });
  });
});
