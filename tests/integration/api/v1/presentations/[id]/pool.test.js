import orchestrator from "tests/orchestrator.js";
import user from "models/user.js";
import session from "models/session.js";
import presentation from "models/presentation.js";
import scene from "models/scene.js";
import elementType from "models/element_type.js";
import sceneElement from "models/scene_element.js";

describe("Test /api/v1/presentations/[id]/pool routes", () => {
  let adminUser, alunoUser;
  let odaikoType, shimeType, testPresentation;

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
      username: "alunoPool",
      email: "alunopool@test.com",
      password: "StrongPassword123@",
    });
    alunoUser = await user.update({
      id: alunoUser.id,
      password: "StrongPassword123@",
    });

    // 3. Criar Tipos de Elementos
    odaikoType = await elementType.create({
      name: "Odaiko",
      image_url: "/odaiko.svg",
    });
    shimeType = await elementType.create({
      name: "Shime",
      image_url: "/shime.svg",
    });

    // 4. Setup da Apresentação (para popular o pool)
    testPresentation = await presentation.create(
      { name: "Show do Pool" },
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

    // 5. Adicionar elementos (Renan 2x, Vi 1x)
    await sceneElement.create({
      scene_id: scene1.id,
      element_type_id: odaikoType.id,
      position_x: 10,
      position_y: 10,
      display_name: "Renan",
    });
    await sceneElement.create({
      scene_id: scene2.id,
      element_type_id: odaikoType.id,
      position_x: 20,
      position_y: 20,
      display_name: "Renan",
    });
    await sceneElement.create({
      scene_id: scene1.id,
      element_type_id: shimeType.id,
      position_x: 30,
      position_y: 30,
      display_name: "Vi",
    });
  });

  describe("GET /api/v1/presentations/[id]/pool", () => {
    it("should allow an Admin (update:presentation) to GET the pool and return 200", async () => {
      const newSession = await session.create(adminUser);
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/presentations/${testPresentation.id}/pool`,
        {
          headers: { cookie: `session_id=${newSession.token}` },
        },
      );
      const resBody = await res.json();

      expect(res.status).toBe(200);
      expect(Array.isArray(resBody)).toBe(true);
      // Deve encontrar 2 itens únicos (Renan e Vi), ignorando o Renan duplicado
      expect(resBody).toHaveLength(2);
      expect(resBody.map((p) => p.display_name)).toContain("Renan");
      expect(resBody.map((p) => p.display_name)).toContain("Vi");
      expect(resBody[0].element_type_name).toBeDefined(); // Verifica se o JOIN funcionou
    });

    it("should return an empty array for a presentation that exists but has no pool", async () => {
      const emptyPres = await presentation.create(
        { name: "Show Vazio" },
        adminUser.id,
      );
      const newSession = await session.create(adminUser);
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/presentations/${emptyPres.id}/pool`,
        {
          headers: { cookie: `session_id=${newSession.token}` },
        },
      );
      const resBody = await res.json();
      expect(res.status).toBe(200);
      expect(resBody).toEqual([]);
    });

    it("should return 400 for an invalid presentation ID (not UUID)", async () => {
      const newSession = await session.create(adminUser);
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/presentations/id-invalido/pool`,
        {
          headers: { cookie: `session_id=${newSession.token}` },
        },
      );
      expect(res.status).toBe(400); // Erro do validator.js
    });

    it("should return 403 for an Aluno (no 'update:presentation' feature)", async () => {
      const newSession = await session.create(alunoUser);
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/presentations/${testPresentation.id}/pool`,
        {
          headers: { cookie: `session_id=${newSession.token}` },
        },
      );
      expect(res.status).toBe(403);
    });

    it("should return 403 for an Anonymous user", async () => {
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/presentations/${testPresentation.id}/pool`,
      );
      expect(res.status).toBe(403);
    });
  });

  describe("Disallowed Methods", () => {
    const url = `${orchestrator.webserverUrl}/api/v1/presentations/${orchestrator.generateRandomUUIDV4()}/pool`;

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

    it("should return 405 for DELETE", async () => {
      const res = await fetch(url, { method: "DELETE" });
      expect(res.status).toBe(405);
    });
  });
});
