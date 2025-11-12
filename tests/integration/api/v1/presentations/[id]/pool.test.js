import orchestrator from "tests/orchestrator.js";
import user from "models/user.js";
import session from "models/session.js";
import presentation from "models/presentation.js";
import scene from "models/scene.js";
import elementType from "models/element_type.js";
import sceneElement from "models/scene_element.js";

describe("Test /api/v1/presentations/[id]/pool routes", () => {
  let adminUser, adminSession, alunoUser, alunoSession, tocadorUser;
  let testPresentation, presentationEmpty, sceneFormation, sceneTransition;
  let elementA, elementB, elementC;

  beforeAll(async () => {
    await orchestrator.waitForAllServices();
    await orchestrator.clearDatabase();
    await orchestrator.runPendingMigrations();

    // 1. Criar Usuários e Sessões
    adminUser = await user.findOneUser({ username: "mainUser" });
    adminUser = await user.update({
      id: adminUser.id,
      password: "StrongPassword123@",
    });
    adminUser = await user.addFeatures(adminUser, [
      "create:presentation",
      "create:scene",
      "create:element",
      "read:presentation",
      "read:presentation:admin",
      "manage:element_types",
    ]);
    adminSession = await session.create(adminUser);

    alunoUser = await user.create({
      username: "alunoPool",
      email: "alunopool@test.com",
      password: "StrongPassword123@",
    });
    alunoSession = await session.create(alunoUser);

    tocadorUser = await user.create({
      username: "tocadorPool",
      email: "tocadorpool@test.com",
      password: "StrongPassword123@",
    });

    // 2. Criar Apresentação Principal
    testPresentation = await presentation.create(
      { name: "Show para Pool" },
      adminUser.id,
    );

    // 3. Criar Apresentação Vazia
    presentationEmpty = await presentation.create(
      { name: "Show Vazio" },
      adminUser.id,
    );

    // 4. Criar Cena de Formação
    sceneFormation = await scene.create({
      presentation_id: testPresentation.id,
      name: "Cena de Formação (Pool)",
      scene_type: "FORMATION",
      order: 1,
    });

    // 5. Criar Cena de Transição
    sceneTransition = await scene.create({
      presentation_id: testPresentation.id,
      name: "Cena de Transição (Pool)",
      scene_type: "TRANSITION",
      order: 2,
    });

    // 6. Criar Elemento (usando 'elementType.create')
    const odaikoType = await elementType.create({
      name: "Odaiko Test Pool",
      image_url: "/odaiko.svg",
      scale: 1.0,
    });

    elementA = await sceneElement.create({
      scene_id: sceneFormation.id,
      element_type_id: odaikoType.id,
      position_x: 50,
      position_y: 50,
      display_name: "Elemento do Pool",
      assigned_user_id: tocadorUser.id,
    });

    const shimeType = await elementType.create({
      name: "Shime Test Pool",
      image_url: "/shime.svg",
      scale: 0.8,
    });

    // 6.2. Adicionar o Elemento B (o segundo item do pool)
    elementB = await sceneElement.create({
      scene_id: sceneFormation.id,
      element_type_id: shimeType.id,
      position_x: 20,
      position_y: 20,
      display_name: "Elemento do Pool 2",
      assigned_user_id: null,
    });

    // 6.3. Adicionar o Elemento C (sem nome, não deve ir para o pool)
    elementC = await sceneElement.create({
      scene_id: sceneFormation.id,
      element_type_id: odaikoType.id,
      position_x: 80,
      position_y: 80,
      display_name: null,
      assigned_user_id: null,
    });
  });

  describe("GET /api/v1/presentations/[id]/pool", () => {
    it("should return 404 for a presentation that doesn't exist", async () => {
      const randomId = orchestrator.generateRandomUUIDV4();
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/presentations/${randomId}/pool`,
        {
          method: "GET",
          headers: { cookie: `session_id=${adminSession.token}` },
        },
      );
      expect(res.status).toBe(404);
    });

    it("should return 403 for an Aluno (no 'read:presentation' feature)", async () => {
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/presentations/${testPresentation.id}/pool`,
        {
          method: "GET",
          headers: { cookie: `session_id=${alunoSession.token}` },
        },
      );
      expect(res.status).toBe(403);
    });

    it("should return 403 for an unauthenticated user", async () => {
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/presentations/${testPresentation.id}/pool`,
        { method: "GET" },
      );
      expect(res.status).toBe(403);
    });

    it("should return the presentation's element pool array (distinct named elements)", async () => {
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/presentations/${testPresentation.id}/pool`,
        {
          method: "GET",
          headers: { cookie: `session_id=${adminSession.token}` },
        },
      );
      const resBody = await res.json();
      expect(res.status).toBe(200);

      // 1. Deve retornar um ARRAY
      expect(Array.isArray(resBody)).toBe(true);

      // 2. AGORA o setup tem 2 elementos nomeados (A e B).
      // O 'findElementPool' deve retornar os 2.
      expect(resBody).toHaveLength(2); // (Esta linha agora passará)

      // 3. Verifica o conteúdo do pool
      expect(resBody).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            display_name: "Elemento do Pool",
            assigned_user_id: tocadorUser.id,
            element_type_name: "Odaiko Test Pool",
          }),
          expect.objectContaining({
            display_name: "Elemento do Pool 2",
            assigned_user_id: null,
            element_type_name: "Shime Test Pool",
          }),
        ]),
      );
    });

    // --- CORREÇÃO DO TESTE 2 ---
    it("should return an empty array if presentation has no named elements (pool)", async () => {
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/presentations/${presentationEmpty.id}/pool`,
        {
          method: "GET",
          headers: { cookie: `session_id=${adminSession.token}` },
        },
      );
      const resBody = await res.json();

      expect(res.status).toBe(200);
      // 1. Deve retornar um ARRAY
      expect(Array.isArray(resBody)).toBe(true);
      // 2. Deve ser um array VAZIO
      expect(resBody).toHaveLength(0);
    });
  });

  // --- Testes de Métodos Não Permitidos ---
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
