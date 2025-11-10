import orchestrator from "tests/orchestrator.js";
import user from "models/user.js";
import session from "models/session.js";
import presentation from "models/presentation.js";
import scene from "models/scene.js";
import elementType from "models/element_type.js";
import sceneElement from "models/scene_element.js";
import database from "infra/database";

describe("Test /api/v1/element_groups/merge routes", () => {
  let adminUser, adminSession;
  let testScene, odaikoType;
  let elementA, elementB, elementC; // 3 elementos
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
      "update:element", // Permissão usada para o merge
      "manage:element_types",
    ]);
    adminSession = await session.create(adminUser);

    // 2. Criar infra
    const testPresentation = await presentation.create(
      { name: "Show para Merge" },
      adminUser.id,
    );
    testScene = await scene.create({
      presentation_id: testPresentation.id,
      name: "Cena de Merge",
      scene_type: "FORMATION",
      order: 1,
    });
    odaikoType = await elementType.create({
      name: "Odaiko",
      image_url: "/odaiko.svg",
    });
  });

  // Criar 2 grupos: groupA (com 1 elemento) e groupB (com 2 elementos)
  beforeEach(async () => {
    // Grupo A (Elemento A)
    elementA = await sceneElement.create({
      scene_id: testScene.id,
      element_type_id: odaikoType.id,
      position_x: 10,
      position_y: 10,
    });
    groupA = elementA.group_id;

    // Grupo B (Elemento B)
    elementB = await sceneElement.create({
      scene_id: testScene.id,
      element_type_id: odaikoType.id,
      position_x: 50,
      position_y: 50,
    });
    groupB = elementB.group_id;

    // Elemento C (Adicionado manualmente ao Grupo B)
    const elCRes = await database.query({
      text: `INSERT INTO scene_elements (scene_id, element_type_id, group_id, position_x, position_y)
             VALUES ($1, $2, $3, 60, 60) RETURNING id;`,
      values: [testScene.id, odaikoType.id, groupB],
    });
    // Precisamos buscar o objeto completo para o 'findById' funcionar
    elementC = await sceneElement.findById(elCRes.rows[0].id);
  });

  afterEach(async () => {
    await database.query("DELETE FROM scene_elements;");
    await database.query("DELETE FROM element_groups;");
  });

  // --- POST (Merge) ---
  describe("POST /api/v1/element_groups/merge", () => {
    it("should merge groupB (2 elements) into groupA (1 element)", async () => {
      const payload = {
        targetGroupId: groupA,
        sourceGroupId: groupB,
      };

      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/element_groups/merge`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${adminSession.token}`,
          },
          body: JSON.stringify(payload),
        },
      );
      const resBody = await res.json();

      expect(res.status).toBe(200); // Sucesso
      expect(resBody.elements_moved).toBe(2); // Moveu elementB e elementC

      // 1. Foco em Testes: Validar que groupB foi deletado
      const groupRes = await database.query({
        text: `SELECT COUNT(*) FROM element_groups WHERE id = $1`,
        values: [groupB],
      });
      expect(groupRes.rows[0].count).toBe("0");

      // 2. Foco em Testes: Validar que groupA agora tem 3 elementos
      const elRes = await database.query({
        text: `SELECT COUNT(*) FROM scene_elements WHERE group_id = $1`,
        values: [groupA],
      });
      expect(elRes.rows[0].count).toBe("3");

      // 3. Foco em Testes: Validar que elementB e elementC agora pertencem a groupA
      const checkB = await sceneElement.findById(elementB.id);
      const checkC = await sceneElement.findById(elementC.id);
      expect(checkB.group_id).toBe(groupA);
      expect(checkC.group_id).toBe(groupA);
    });

    it("should return 400 if trying to merge a group into itself", async () => {
      const payload = {
        targetGroupId: groupA,
        sourceGroupId: groupA, // Mesmo ID
      };

      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/element_groups/merge`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${adminSession.token}`,
          },
          body: JSON.stringify(payload),
        },
      );
      expect(res.status).toBe(400); // Baseado no ServiceError do model
    });
  });
});
