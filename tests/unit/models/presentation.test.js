import orchestrator from "tests/orchestrator.js";
import presentation from "models/presentation.js";
import scene from "models/scene.js";
import sceneElement from "models/scene_element.js";
import elementType from "models/element_type.js";
import transitionStep from "models/transition_step.js";
import user from "models/user.js";
import presentationViewer from "models/presentation_viewer.js";
import { NotFoundError } from "errors/index.js";

describe("Presentation Model Tests", () => {
  let adminUser, viewerUser, otherUser;
  let odaikoType, shimeType;

  beforeAll(async () => {
    await orchestrator.waitForAllServices();
    await orchestrator.clearDatabase();
    await orchestrator.runPendingMigrations();

    adminUser = await user.findOneUser({ username: "mainUser" });
    viewerUser = await user.create({
      username: "viewerUser",
      email: "viewer@test.com",
      password: "StrongPassword123@",
    });

    otherUser = await user.create({
      username: "otherUser",
      email: "other@test.com",
      password: "StrongPassword123@",
    });

    odaikoType = await elementType.create({
      name: "OdaikoTest",
      image_url: "/odaiko.svg",
      scale: 1.0,
    });

    shimeType = await elementType.create({
      name: "ShimeTest",
      image_url: "/shime.svg",
      scale: 1.0,
    });
  });

  describe("create()", () => {
    it("should create a presentation successfully", async () => {
      const pres = await presentation.create(
        { name: "My Presentation", description: "Desc" },
        adminUser.id,
      );
      expect(pres.id).toBeDefined();
      expect(pres.name).toBe("My Presentation");
      expect(pres.created_by_user_id).toBe(adminUser.id);
    });
  });

  describe("update()", () => {
    it("should update a presentation", async () => {
      const pres = await presentation.create(
        { name: "Old Name" },
        adminUser.id,
      );
      const updated = await presentation.update(pres.id, { name: "New Name" });
      expect(updated.name).toBe("New Name");
    });

    it("should throw NotFoundError if presentation does not exist", async () => {
      await expect(
        presentation.update(orchestrator.generateRandomUUIDV4(), {
          name: "X12",
        }),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe("del()", () => {
    it("should delete a presentation", async () => {
      const pres = await presentation.create(
        { name: "To Delete" },
        adminUser.id,
      );
      await presentation.del(pres.id);
      const found = await presentation.findById(pres.id);
      expect(found).toBeUndefined();
    });
  });

  describe("findById()", () => {
    it("should find a presentation by id", async () => {
      const pres = await presentation.create({ name: "Find Me" }, adminUser.id);
      const found = await presentation.findById(pres.id);
      expect(found.id).toBe(pres.id);
    });
  });

  describe("findAllByUserId()", () => {
    it("should return unique presentations even if user is viewer multiple times (or creator + viewer)", async () => {
      const pres = await presentation.create(
        { name: "Unique Check" },
        adminUser.id,
      );
      await presentationViewer.addViewer(pres.id, viewerUser.id);
      await presentationViewer.addViewer(pres.id, otherUser.id);
      const list = await presentation.findAllByUserId(adminUser.id);
      const targetPres = list.filter((p) => p.id === pres.id);

      expect(targetPres).toHaveLength(1);
    });
  });

  describe("checkViewerOrCreator()", () => {
    it("should return true/data if user is creator", async () => {
      const pres = await presentation.create({ name: "My Pres" }, adminUser.id);
      const result = await presentation.checkViewerOrCreator(
        pres.id,
        adminUser.id,
      );
      expect(result.isCreator).toBe(true);
    });

    it("should return true/data if user is viewer", async () => {
      const pres = await presentation.create({ name: "Shared" }, adminUser.id);
      await presentationViewer.addViewer(pres.id, viewerUser.id);
      const result = await presentation.checkViewerOrCreator(
        pres.id,
        viewerUser.id,
      );
      expect(result.id).toBe(pres.id);
      expect(result.isCreator).toBe(false);
    });

    it("should throw NotFoundError if user has no access", async () => {
      const pres = await presentation.create({ name: "Secret" }, adminUser.id);
      await expect(
        presentation.checkViewerOrCreator(pres.id, otherUser.id),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe("reorderScenes()", () => {
    it("should update scene orders", async () => {
      const pres = await presentation.create({ name: "Reorder" }, adminUser.id);
      const s1 = await scene.create({
        presentation_id: pres.id,
        name: "S12",
        scene_type: "FORMATION",
        order: 0,
      });
      const s2 = await scene.create({
        presentation_id: pres.id,
        name: "S22",
        scene_type: "FORMATION",
        order: 1,
      });

      // Inverter ordem
      await presentation.reorderScenes(pres.id, [s2.id, s1.id]);

      const updated1 = await scene.findById(s1.id);
      const updated2 = await scene.findById(s2.id);

      expect(updated1.order).toBe(1);
      expect(updated2.order).toBe(0);
    });
  });

  // --- FUNÇÕES REFATORADAS (TESTES PRINCIPAIS) ---

  describe("findDeepById()", () => {
    it("should return presentation with scenes, elements, steps AND assignees", async () => {
      const pres = await presentation.create({ name: "Deep" }, adminUser.id);

      // Scene 1: Formation
      const s1 = await scene.create({
        presentation_id: pres.id,
        name: "Formation",
        scene_type: "FORMATION",
        order: 0,
      });
      await sceneElement.create({
        scene_id: s1.id,
        element_type_id: odaikoType.id,
        position_x: 10,
        position_y: 10,
        display_name: "El 1",
        assignees: [viewerUser.id], // 1 assignee
      });

      // Scene 2: Transition
      const s2 = await scene.create({
        presentation_id: pres.id,
        name: "Transition",
        scene_type: "TRANSITION",
        order: 1,
      });
      await transitionStep.create({
        scene_id: s2.id,
        order: 0,
        description: "Step 1",
        assignees: [viewerUser.id, otherUser.id], // 2 assignees
      });

      const deep = await presentation.findDeepById(pres.id);

      expect(deep.scenes).toHaveLength(2);

      // Verifica Formação
      const deepS1 = deep.scenes.find((s) => s.id === s1.id);
      expect(deepS1.scene_elements).toHaveLength(1);
      expect(deepS1.scene_elements[0].assignees).toEqual([viewerUser.id]);

      // Verifica Transição
      const deepS2 = deep.scenes.find((s) => s.id === s2.id);
      expect(deepS2.transition_steps).toHaveLength(1);
      expect(deepS2.transition_steps[0].assignees).toHaveLength(2);
      expect(deepS2.transition_steps[0].assignees).toContain(viewerUser.id);
      expect(deepS2.transition_steps[0].assignees).toContain(otherUser.id);
    });
  });

  describe("findElementPool()", () => {
    it("should return distinct element types used in the presentation", async () => {
      const pres = await presentation.create({ name: "Pool" }, adminUser.id);
      const s1 = await scene.create({
        presentation_id: pres.id,
        name: "S12",
        scene_type: "FORMATION",
        order: 0,
      });
      await sceneElement.create({
        scene_id: s1.id,
        element_type_id: odaikoType.id,
        position_x: 0,
        position_y: 0,
        display_name: "Teste",
      });

      const pool = await presentation.findElementPool(pres.id);
      expect(pool).toHaveLength(1);
      expect(pool[0].element_type_id).toBe(odaikoType.id);
    });
  });

  describe("updateElementGlobally()", () => {
    let pres, s1, el1, el2;

    beforeEach(async () => {
      pres = await presentation.create({ name: "Global" }, adminUser.id);
      s1 = await scene.create({
        presentation_id: pres.id,
        name: "S12",
        scene_type: "FORMATION",
        order: 0,
      });
      el1 = await sceneElement.create({
        scene_id: s1.id,
        element_type_id: odaikoType.id,
        display_name: "Old",
        assignees: [viewerUser.id],
        position_x: 0,
        position_y: 0,
      });
      el2 = await sceneElement.create({
        scene_id: s1.id,
        element_type_id: odaikoType.id,
        display_name: "Old",
        assignees: [viewerUser.id],
        position_x: 10,
        position_y: 10,
      });
    });

    it("should update assignees for multiple groups", async () => {
      // Atualizar para [otherUser]
      const result = await presentation.updateElementGlobally(pres.id, {
        element_type_id: odaikoType.id,
        old_display_name: "Old",
        new_assignees: [otherUser.id],
      });

      expect(result.updatedCount).toBe(2);

      // Verificar deep
      const deep = await presentation.findDeepById(pres.id);
      const els = deep.scenes[0].scene_elements;

      expect(els[0].assignees).toEqual([otherUser.id]);
      expect(els[1].assignees).toEqual([otherUser.id]);
      expect(els[0].display_name).toBe("Old"); // Nome não mudou
    });

    it("should update display_name for multiple groups", async () => {
      const result = await presentation.updateElementGlobally(pres.id, {
        element_type_id: odaikoType.id,
        old_display_name: "Old",
        new_display_name: "New Global",
      });

      expect(result.updatedCount).toBe(2);
      const deep = await presentation.findDeepById(pres.id);
      expect(deep.scenes[0].scene_elements[0].display_name).toBe("New Global");
    });

    it("should handle empty assignees (clear users)", async () => {
      await presentation.updateElementGlobally(pres.id, {
        element_type_id: odaikoType.id,
        old_display_name: "Old",
        new_assignees: [],
      });

      const deep = await presentation.findDeepById(pres.id);
      const el = deep.scenes[0].scene_elements.find((e) => e.id === el1.id);
      expect(el.assignees).toEqual([]);
    });
  });

  describe("findGroupsByCriteria", () => {
    let pres, s1, el1, el2, el3, el4;

    beforeEach(async () => {
      pres = await presentation.create(
        { name: "Criteria Search" },
        adminUser.id,
      );
      s1 = await scene.create({
        presentation_id: pres.id,
        name: "S12",
        scene_type: "FORMATION",
        order: 0,
      });

      // Grupo Alvo (Lucas tocando Odaiko) - ID 1
      el1 = await sceneElement.create({
        scene_id: s1.id,
        element_type_id: odaikoType.id,
        display_name: "Lucas",
        position_x: 10,
        position_y: 10,
      });

      // Grupo Alvo 2 (Lucas tocando Odaiko em outra posição) - ID 2
      el2 = await sceneElement.create({
        scene_id: s1.id,
        element_type_id: odaikoType.id,
        display_name: "Lucas",
        position_x: 20,
        position_y: 20,
      });

      // Grupo Diferente (João tocando Odaiko) - ID 3
      el3 = await sceneElement.create({
        scene_id: s1.id,
        element_type_id: odaikoType.id,
        display_name: "João",
        position_x: 30,
        position_y: 30,
      });

      // Grupo Diferente (Lucas tocando Shime) - ID 4
      el4 = await sceneElement.create({
        scene_id: s1.id,
        element_type_id: shimeType.id,
        display_name: "Lucas",
        position_x: 40,
        position_y: 40,
      });
    });

    it("should find all groups matching display_name and element_type_id within presentation", async () => {
      const groupIds = await presentation.findGroupsByCriteria(pres.id, {
        display_name: "Lucas",
        element_type_id: odaikoType.id,
      });

      // Deve achar el1 e el2, mas não el3 (nome errado) nem el4 (tipo errado)
      expect(groupIds).toHaveLength(2);
      expect(groupIds).toContain(el1.group_id);
      expect(groupIds).toContain(el2.group_id);
      expect(groupIds).not.toContain(el3.group_id);
      expect(groupIds).not.toContain(el4.group_id);
    });

    it("should not find groups from another presentation", async () => {
      // Criar outra apresentação com elemento igual
      const pres2 = await presentation.create({ name: "Other" }, adminUser.id);
      const s2 = await scene.create({
        presentation_id: pres2.id,
        name: "S24",
        scene_type: "FORMATION",
        order: 0,
      });
      await sceneElement.create({
        scene_id: s2.id,
        element_type_id: odaikoType.id,
        display_name: "Lucas",
        position_x: 10,
        position_y: 10,
      });

      const groupIds = await presentation.findGroupsByCriteria(pres.id, {
        // Busca na pres original
        display_name: "Lucas",
        element_type_id: odaikoType.id,
      });

      expect(groupIds).toHaveLength(2); // Apenas os 2 originais
    });
  });
});
