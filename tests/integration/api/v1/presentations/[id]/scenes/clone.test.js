import orchestrator from "tests/orchestrator.js";
import database from "infra/database";
import user from "models/user.js";
import session from "models/session.js";
import presentation from "models/presentation.js";
import scene from "models/scene.js";
import elementType from "models/element_type.js";
import sceneElement from "models/scene_element.js";
import transitionStep from "models/transition_step.js";
import presentationViewer from "models/presentation_viewer.js";

// Setup (Similar ao teste de modelo)
let adminUser, adminSession, tocadorUser1, tocadorUser2;
let presentationA, presentationB;
let sourceFormationScene, sourceTransitionScene;
let sceneDataB; // Simula o 'findDeepById'

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();

  // 1. Criar Usuários
  adminUser = await user.findOneUser({ username: "mainUser" });
  adminUser = await user.update({
    id: adminUser.id,
    password: "StrongPassword123@",
  });
  adminUser = await user.addFeatures(adminUser, [
    "create:presentation",
    "create:scene", // Permissão necessária para a rota
  ]);
  adminSession = await session.create(adminUser);

  tocadorUser1 = await user.create({
    username: "cloneTocador1",
    email: "clonetocador1@test.com",
    password: "StrongPassword123@",
  });
  tocadorUser2 = await user.create({
    username: "cloneTocador2",
    email: "clonetocador2@test.com",
    password: "StrongPassword123@",
  });

  // 2. Criar Apresentações
  presentationA = await presentation.create(
    { name: "Apresentação Alvo (A)" },
    adminUser.id,
  );
  presentationB = await presentation.create(
    { name: "Apresentação Fonte (B)" },
    adminUser.id,
  );

  // 3. Criar Elenco (Viewers)
  await presentationViewer.addViewer(presentationA.id, tocadorUser1.id, {});
  await presentationViewer.addViewer(presentationB.id, tocadorUser1.id, {});
  await presentationViewer.addViewer(presentationB.id, tocadorUser2.id, {});

  // 4. Criar Tipos de Elementos
  const odaikoType = await elementType.create({
    name: "Odaiko (Clone)",
    image_url: "/odaiko.svg",
    scale: 1.0,
  });
  const shimeType = await elementType.create({
    name: "Shime (Clone)",
    image_url: "/shime.svg",
    scale: 0.8,
  });

  // 5. Criar Cena Fonte (FORMATION) em Pres B
  const tempFormationScene = await scene.create({
    presentation_id: presentationB.id,
    order: 0,
    name: "Fonte Formação",
    scene_type: "FORMATION",
  });
  await sceneElement.create({
    scene_id: tempFormationScene.id,
    element_type_id: odaikoType.id,
    position_x: 10,
    position_y: 10,
    display_name: "Lider",
    assignees: [tocadorUser1.id],
  });
  await sceneElement.create({
    scene_id: tempFormationScene.id,
    element_type_id: shimeType.id,
    position_x: 20,
    position_y: 20,
    display_name: "Suporte",
    assignees: [tocadorUser2.id],
  });

  // 6. Criar Cena Fonte (TRANSITION) em Pres B
  const tempTransitionScene = await scene.create({
    presentation_id: presentationB.id,
    order: 1,
    name: "Fonte Transição",
    scene_type: "TRANSITION",
  });
  await transitionStep.create({
    scene_id: tempTransitionScene.id,
    description: "Passo T1",
    order: 0,
    assignees: [tocadorUser1.id],
  });

  // 7. Simular o 'findDeepById' (o payload que o frontend enviará)
  sceneDataB = await presentation.findDeepById(presentationB.id);
  sourceFormationScene = sceneDataB.scenes.find(
    (s) => s.scene_type === "FORMATION",
  );
  sourceTransitionScene = sceneDataB.scenes.find(
    (s) => s.scene_type === "TRANSITION",
  );
});
// Fim do Setup

describe("POST /api/v1/presentations/[id]/scenes/clone", () => {
  it("should clone FORMATION with 'with_users' and add missing users to cast", async () => {
    const res = await fetch(
      `${orchestrator.webserverUrl}/api/v1/presentations/${presentationA.id}/scenes/clone`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `session_id=${adminSession.token}`,
        },
        body: JSON.stringify({
          sceneData: sourceFormationScene, // (Payload completo do findDeepById)
          pasteOption: "with_users",
        }),
      },
    );

    const resBody = await res.json();
    expect(res.status).toBe(201);
    expect(resBody.presentation_id).toBe(presentationA.id);
    expect(resBody.name).toBe("(Cópia) Fonte Formação");

    // 1. Verificar Side Effect (Usuários)
    const viewersA = await presentationViewer.findByPresentationId(
      presentationA.id,
    );
    expect(viewersA).toHaveLength(2); // T1 (existente) + T2 (adicionado)
    expect(viewersA).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: tocadorUser1.id }),
        expect.objectContaining({ id: tocadorUser2.id }),
      ]),
    );

    // 2. Verificar Grupos
    const groups = (
      await database.query({
        text: `
      SELECT 
        eg.*,
        COALESCE(
          (
            SELECT json_agg(ega.user_id)
            FROM element_group_assignees ega
            WHERE ega.element_group_id = eg.id
          ),
          '[]'::json
        ) AS assignees
      FROM 
        element_groups eg 
      WHERE 
        eg.scene_id = $1 
      ORDER BY 
        eg.display_name
    `,
        values: [resBody.id], // ID da nova cena
      })
    ).rows;
    expect(groups).toHaveLength(2);
    expect(groups[0].display_name).toBe("Lider");
    expect(groups[0].assignees).toEqual([tocadorUser1.id]);
    expect(groups[1].display_name).toBe("Suporte");
    expect(groups[1].assignees).toEqual([tocadorUser2.id]);
  });

  it("should clone FORMATION with 'with_names' (no users)", async () => {
    const res = await fetch(
      `${orchestrator.webserverUrl}/api/v1/presentations/${presentationA.id}/scenes/clone`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `session_id=${adminSession.token}`,
        },
        body: JSON.stringify({
          sceneData: sourceFormationScene,
          pasteOption: "with_names",
        }),
      },
    );

    const resBody = await res.json();
    expect(res.status).toBe(201);

    // 1. Verificar Grupos
    const groups = (
      await database.query({
        text: `
      SELECT 
        eg.*,
        COALESCE(
          (
            SELECT json_agg(ega.user_id)
            FROM element_group_assignees ega
            WHERE ega.element_group_id = eg.id
          ),
          '[]'::json
        ) AS assignees
      FROM 
        element_groups eg 
      WHERE 
        eg.scene_id = $1 
      ORDER BY 
        eg.display_name
    `,
        values: [resBody.id], // ID da nova cena
      })
    ).rows;
    expect(groups).toHaveLength(2);
    expect(groups[0].display_name).toBe("Lider");
    expect(groups[0].assignees).toEqual([]); // <-- MUDANÇA
    expect(groups[1].display_name).toBe("Suporte");
    expect(groups[1].assignees).toEqual([]); // <-- MUDANÇA
  });

  it("should clone FORMATION with 'elements_only'", async () => {
    const res = await fetch(
      `${orchestrator.webserverUrl}/api/v1/presentations/${presentationA.id}/scenes/clone`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `session_id=${adminSession.token}`,
        },
        body: JSON.stringify({
          sceneData: sourceFormationScene,
          pasteOption: "elements_only",
        }),
      },
    );

    const resBody = await res.json();
    expect(res.status).toBe(201);

    // 1. Verificar Grupos
    const groups = (
      await database.query({
        text: `
      SELECT 
        eg.*,
        COALESCE(
          (
            SELECT json_agg(ega.user_id)
            FROM element_group_assignees ega
            WHERE ega.element_group_id = eg.id
          ),
          '[]'::json
        ) AS assignees
      FROM 
        element_groups eg 
      WHERE 
        eg.scene_id = $1 
      ORDER BY 
        eg.display_name
    `,
        values: [resBody.id], // ID da nova cena
      })
    ).rows;
    expect(groups).toHaveLength(2);
    expect(groups[0].display_name).toBeNull(); // <-- MUDANÇA
    expect(groups[0].assignees).toEqual([]); // <-- MUDANÇA
  });

  it("should clone TRANSITION with 'with_users'", async () => {
    const res = await fetch(
      `${orchestrator.webserverUrl}/api/v1/presentations/${presentationA.id}/scenes/clone`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `session_id=${adminSession.token}`,
        },
        body: JSON.stringify({
          sceneData: sourceTransitionScene,
          pasteOption: "with_users",
        }),
      },
    );
    const resBody = await res.json();
    expect(res.status).toBe(201);

    // 1. Verificar Passos
    const steps = (
      await database.query({
        text: `
      SELECT 
        ts.*,
        COALESCE(
          (
            SELECT json_agg(tsa.user_id)
            FROM transition_step_assignees tsa
            WHERE tsa.transition_step_id = ts.id
          ),
          '[]'::json
        ) AS assignees
      FROM 
        transition_steps ts
      WHERE 
        ts.scene_id = $1 
      ORDER BY 
        ts."order"
    `,
        values: [resBody.id], // ID da nova cena
      })
    ).rows;

    expect(steps).toHaveLength(1); // O setup de teste só tinha 1 passo
    expect(steps[0].description).toBe("Passo T1");
    expect(steps[0].assignees).toEqual([tocadorUser1.id]);
  });

  // Testes de Erro (Validação da Rota)

  it("should return 401 if user is not authenticated", async () => {
    const res = await fetch(
      `${orchestrator.webserverUrl}/api/v1/presentations/${presentationA.id}/scenes/clone`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sceneData: sourceFormationScene,
          pasteOption: "with_users",
        }),
      },
    );
    expect(res.status).toBe(401);
  });

  it("should return 400 if 'pasteOption' is missing", async () => {
    const res = await fetch(
      `${orchestrator.webserverUrl}/api/v1/presentations/${presentationA.id}/scenes/clone`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `session_id=${adminSession.token}`,
        },
        body: JSON.stringify({
          sceneData: sourceFormationScene,
        }),
      },
    );
    expect(res.status).toBe(400);
  });

  it("should return 400 if 'sceneData' is missing", async () => {
    const res = await fetch(
      `${orchestrator.webserverUrl}/api/v1/presentations/${presentationA.id}/scenes/clone`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `session_id=${adminSession.token}`,
        },
        body: JSON.stringify({
          pasteOption: "with_users",
        }),
      },
    );
    expect(res.status).toBe(400);
  });

  it("should return 400 if 'targetPresentationId' (URL) is invalid", async () => {
    const res = await fetch(
      `${orchestrator.webserverUrl}/api/v1/presentations/invalid-uuid/scenes/clone`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `session_id=${adminSession.token}`,
        },
        body: JSON.stringify({
          sceneData: sourceFormationScene,
          pasteOption: "with_users",
        }),
      },
    );
    expect(res.status).toBe(400); // (Vem do middleware 'validateRequest')
  });

  it("should return 404 if 'sceneData' (body) is invalid", async () => {
    const fakeSceneData = {
      ...sourceFormationScene,
      id: orchestrator.generateRandomUUIDV4(),
    };
    const res = await fetch(
      `${orchestrator.webserverUrl}/api/v1/presentations/${presentationA.id}/scenes/clone`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `session_id=${adminSession.token}`,
        },
        body: JSON.stringify({
          sceneData: fakeSceneData,
          pasteOption: "with_users",
        }),
      },
    );
    expect(res.status).toBe(404); // (Vem do middleware 'validateRequest')
  });
});
