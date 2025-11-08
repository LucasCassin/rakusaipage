import orchestrator from "tests/orchestrator.js";
import user from "models/user.js";
import session from "models/session.js";
import presentation from "models/presentation.js"; //
import scene from "models/scene.js"; //

describe("Test /api/v1/presentations/[id]/scenes routes", () => {
  let adminUser, regularUser;
  let pres, sceneA, sceneB, sceneC;

  beforeAll(async () => {
    await orchestrator.waitForAllServices();
    await orchestrator.clearDatabase();
    await orchestrator.runPendingMigrations();

    // 1. Criar Admin, atualizar senha e dar features de escrita
    adminUser = await user.findOneUser({ username: "mainUser" });
    adminUser = await user.update({
      id: adminUser.id,
      password: "StrongPassword123@", //
    });
    adminUser = await user.addFeatures(adminUser, [
      "create:presentation",
      "update:presentation",
      "create:scene",
    ]);

    // 2. Criar Aluno (sem features)
    regularUser = await user.create({
      username: "alunoReorder",
      email: "reorder@test.com",
      password: "StrongPassword123@",
    });
    regularUser = await user.update({
      id: regularUser.id,
      password: "StrongPassword123@",
    });

    // 3. Criar Apresentação e Cenas (Admin é o dono)
    pres = await presentation.create({ name: "Reorder Show" }, adminUser.id);
    sceneA = await scene.create({
      presentation_id: pres.id,
      name: "Scene A",
      scene_type: "FORMATION",
      order: 0,
    });
    sceneB = await scene.create({
      presentation_id: pres.id,
      name: "Scene B",
      scene_type: "TRANSITION",
      order: 1,
    });
    sceneC = await scene.create({
      presentation_id: pres.id,
      name: "Scene C",
      scene_type: "FORMATION",
      order: 2,
    });
  });

  describe("PATCH /api/v1/presentations/[id]/scenes", () => {
    it("should allow an Admin (owner) to reorder the scenes and return 200", async () => {
      const newSession = await session.create(adminUser);
      const newOrderIds = [sceneC.id, sceneA.id, sceneB.id];
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/presentations/${pres.id}/scenes`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${newSession.token}`,
          },
          body: JSON.stringify({ scene_ids: newOrderIds }),
        },
      );

      expect(res.status).toBe(200);

      // Verificar no banco se a ordem realmente mudou
      const updatedPres = await presentation.findDeepById(pres.id);
      expect(updatedPres.scenes[0].name).toBe("Scene C");
      expect(updatedPres.scenes[1].name).toBe("Scene A");
      expect(updatedPres.scenes[2].name).toBe("Scene B");
    });

    it("should return 403 for a Regular User (not owner)", async () => {
      const newSession = await session.create(regularUser); //
      const newOrderIds = [sceneA.id, sceneC.id, sceneB.id];

      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/presentations/${pres.id}/scenes`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${newSession.token}`,
          },
          body: JSON.stringify({ scene_ids: newOrderIds }),
        },
      );

      expect(res.status).toBe(403); // Proibido (não é o dono)
    });

    it("should return 400 if 'scene_ids' is missing", async () => {
      const newSession = await session.create(adminUser);
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/presentations/${pres.id}/scenes`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${newSession.token}`,
          },
          body: JSON.stringify({ not_scene_ids: [] }), // Body inválido
        },
      );
      expect(res.status).toBe(400); // Erro do validator.js
    });
  });

  describe("Disallowed Methods", () => {
    const url = `${orchestrator.webserverUrl}/api/v1/presentations/${orchestrator.generateRandomUUIDV4()}/scenes`;

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
