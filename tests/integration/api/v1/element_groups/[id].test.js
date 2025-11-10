import orchestrator from "tests/orchestrator.js";
import user from "models/user.js";
import session from "models/session.js";
import presentation from "models/presentation.js";
import scene from "models/scene.js";
import elementType from "models/element_type.js";
import sceneElement from "models/scene_element.js"; // Para criar
import elementGroup from "models/element_group.js"; // Para buscar
import database from "infra/database";

describe("Test /api/v1/element_groups/[id] routes", () => {
  let adminUser, adminSession, tocadorUser;
  let testScene, odaikoType;
  let elementA, elementB; // 2 elementos
  let groupA, groupB; // 2 grupos

  beforeAll(async () => {
    await orchestrator.waitForAllServices();
    await orchestrator.clearDatabase();
    await orchestrator.runPendingMigrations();

    // 1. Criar Admin e sessão
    adminUser = await user.findOneUser({ username: "mainUser" });
    adminUser = await user.update({
      id: adminUser.id,
      password: "StrongPassword123@",
    });
    adminUser = await user.addFeatures(adminUser, [
      "create:presentation",
      "create:scene",
      "create:element",
      "update:element", // Permissão para PATCH
      "delete:element", // Permissão para DELETE
      "manage:element_types",
    ]);
    adminSession = await session.create(adminUser);

    tocadorUser = await user.create({
      username: "tocadorElement",
      email: "tocadorelement@test.com",
      password: "StrongPassword123@",
    });

    // 2. Criar infra
    const testPresentation = await presentation.create(
      { name: "Show para Grupos" },
      adminUser.id,
    );
    testScene = await scene.create({
      presentation_id: testPresentation.id,
      name: "Cena de Grupos",
      scene_type: "FORMATION",
      order: 1,
    });
    odaikoType = await elementType.create({
      name: "Odaiko",
      image_url: "/odaiko.svg",
    });
  });

  // Criar 2 grupos: groupA (1 elemento) e groupB (1 elemento)
  beforeEach(async () => {
    elementA = await sceneElement.create({
      scene_id: testScene.id,
      element_type_id: odaikoType.id,
      position_x: 10,
      position_y: 10,
      display_name: "Grupo A Original",
    });
    groupA = elementA.group_id;

    elementB = await sceneElement.create({
      scene_id: testScene.id,
      element_type_id: odaikoType.id,
      position_x: 50,
      position_y: 50,
      display_name: "Grupo B Original",
      assigned_user_id: tocadorUser.id,
    });
    groupB = elementB.group_id;
  });

  afterEach(async () => {
    await database.query("DELETE FROM scene_elements;");
    await database.query("DELETE FROM element_groups;");
  });

  // --- PATCH ---
  describe("PATCH /api/v1/element_groups/[id]", () => {
    it("should update a group's 'display_name' and 'assigned_user_id'", async () => {
      const payload = {
        display_name: "Grupo A Atualizado",
        assigned_user_id: tocadorUser.id,
      };

      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/element_groups/${groupA}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${adminSession.token}`,
          },
          body: JSON.stringify(payload),
        },
      );
      const resBody = await res.json();

      expect(res.status).toBe(200);
      expect(resBody.display_name).toBe("Grupo A Atualizado");
      expect(resBody.assigned_user_id).toBe(tocadorUser.id);

      // Foco em Testes: Validar no banco
      const groupInDb = await elementGroup.findGroupById(groupA);
      expect(groupInDb.display_name).toBe("Grupo A Atualizado");
    });
  });

  // --- DELETE (CASCADE) ---
  describe("DELETE /api/v1/element_groups/[id]", () => {
    it("should delete a group and ALL its elements (CASCADE)", async () => {
      // 1. Adicionar um segundo elemento ao groupA
      await database.query({
        text: `INSERT INTO scene_elements (scene_id, element_type_id, group_id, position_x, position_y)
               VALUES ($1, $2, $3, 20, 20)`,
        values: [testScene.id, odaikoType.id, groupA],
      });

      // 2. Deletar o groupA (que tem 2 elementos)
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/element_groups/${groupA}`,
        {
          method: "DELETE",
          headers: { cookie: `session_id=${adminSession.token}` },
        },
      );
      expect(res.status).toBe(200);

      // 3. Foco em Testes: Validar que o grupo foi deletado
      const groupRes = await database.query({
        text: `SELECT COUNT(*) FROM element_groups WHERE id = $1`,
        values: [groupA],
      });
      expect(groupRes.rows[0].count).toBe("0");

      // 4. Foco em Testes: Validar que os elementos filhos foram deletados
      const elRes = await database.query({
        text: `SELECT COUNT(*) FROM scene_elements WHERE group_id = $1`,
        values: [groupA],
      });
      expect(elRes.rows[0].count).toBe("0");

      // 5. Validar que o groupB não foi afetado
      const groupBRes = await database.query({
        text: `SELECT COUNT(*) FROM element_groups WHERE id = $1`,
        values: [groupB],
      });
      expect(groupBRes.rows[0].count).toBe("1");
    });
  });
});
