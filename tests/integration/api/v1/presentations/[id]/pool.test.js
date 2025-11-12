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
  let elementA;

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
      "read:presentation:admin", // <-- CORREÇÃO (Insight do Usuário)
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
  });

  describe("GET /api/v1/presentations/[id]/pool", () => {
    // --- Teste de Segurança (404) ---
    it("should return 404 for a presentation that doesn't exist", async () => {
      const randomId = orchestrator.generateRandomUUIDV4();
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/presentations/${randomId}/pool`,
        {
          method: "GET",
          headers: { cookie: `session_id=${adminSession.token}` },
        },
      );
      // CORREÇÃO: Esperar 404, que agora será retornado pelo handler corrigido.
      expect(res.status).toBe(404);
    });

    // --- Teste de Segurança (403) ---
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

    // --- Teste de Segurança (403) ---
    it("should return 403 for an unauthenticated user", async () => {
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/presentations/${testPresentation.id}/pool`,
        { method: "GET" },
      );
      // CORREÇÃO: Manter 403, pois 'authorization.js' retorna Forbidden.
      expect(res.status).toBe(403);
    });

    // --- Teste de Sucesso (Refatorado) ---
    it("should return the full data pool (presentation, scenes, elements with JOIN, steps)", async () => {
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/presentations/${testPresentation.id}/pool`,
        {
          method: "GET",
          headers: { cookie: `session_id=${adminSession.token}` },
        },
      );
      const resBody = await res.json();
      expect(res.status).toBe(200);
      // CORREÇÃO: Com a feature 'read:presentation:admin', 'resBody.presentation'
      // não será 'undefined'.
      expect(resBody.presentation.id).toBe(testPresentation.id);
      expect(resBody.scenes).toHaveLength(2);

      const formationScene = resBody.scenes[0];
      const transitionScene = resBody.scenes[1];

      // Foco em Testes (JOIN): Validar 'scene_elements'
      expect(formationScene.name).toBe("Cena de Formação (Pool)");
      expect(formationScene.elements).toHaveLength(1);
      const elementInPool = formationScene.elements[0];

      expect(elementInPool.id).toBe(elementA.id);
      expect(elementInPool.group_id).toBe(elementA.group_id);
      expect(elementInPool.display_name).toBe("Elemento do Pool");
      expect(elementInPool.assigned_user_id).toBe(tocadorUser.id);

      // Validar 'transition_steps'
      expect(transitionScene.name).toBe("Cena de Transição (Pool)");
      expect(transitionScene.steps).toHaveLength(0);
    });

    // --- Teste de Caso de Borda (Empty Array) ---
    it("should return an empty 'scenes' array if presentation has no scenes", async () => {
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/presentations/${presentationEmpty.id}/pool`,
        {
          method: "GET",
          headers: { cookie: `session_id=${adminSession.token}` },
        },
      );
      const resBody = await res.json();

      expect(res.status).toBe(200);
      // CORREÇÃO: Também válido aqui, 'presentation' não será 'undefined'.
      expect(resBody.presentation.id).toBe(presentationEmpty.id);
      expect(resBody.scenes).toHaveLength(0); // Este é o teste
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
