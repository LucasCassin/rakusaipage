import orchestrator from "tests/orchestrator.js";
import presentation from "models/presentation.js";
import presentationViewer from "models/presentation_viewer.js";
import scene from "models/scene.js";
import sceneElement from "models/scene_element.js";
import elementType from "models/element_type.js";
import transitionStep from "models/transition_step.js";
import user from "models/user.js";
import {
  ValidationError,
  ForbiddenError,
  NotFoundError,
} from "errors/index.js";

describe("Presentation Model", () => {
  let adminUser, regularUser;
  let odaikoType, shimeType, pessoaType;

  beforeAll(async () => {
    await orchestrator.waitForAllServices();
    await orchestrator.clearDatabase();
    await orchestrator.runPendingMigrations();

    // Cria usuários
    adminUser = await user.findOneUser({ username: "mainUser" }); // Usuário Admin
    regularUser = await user.create({
      username: "alunoComum",
      email: "aluno@test.com",
      password: "StrongPassword123@",
    });

    // Cria os tipos de elementos
    odaikoType = await elementType.create({
      name: "Odaiko",
      image_url: "/odaiko.svg",
    });
    shimeType = await elementType.create({
      name: "Shime",
      image_url: "/shime.svg",
    });
    pessoaType = await elementType.create({
      name: "Pessoa",
      image_url: "/pessoa.svg",
    });
  });

  describe("create(), findById(), update(), and del()", () => {
    let presId;

    it("should create a new presentation", async () => {
      const data = { name: "Show de Teste", location: "Suzano" };
      const newPres = await presentation.create(data, adminUser.id);
      presId = newPres.id;

      expect(newPres.name).toBe("Show de Teste");
      expect(newPres.created_by_user_id).toBe(adminUser.id);
    });

    it("should fail to create if name is missing", async () => {
      const data = { location: "Suzano" };
      await expect(presentation.create(data, adminUser.id)).rejects.toThrow(
        ValidationError,
      );
    });

    it("should find the created presentation by ID", async () => {
      const foundPres = await presentation.findById(presId);
      expect(foundPres.name).toBe("Show de Teste");
    });

    it("should update the presentation", async () => {
      const data = { name: "Show de Teste (Editado)", is_public: true };
      const updatedPres = await presentation.update(presId, data, adminUser.id);
      expect(updatedPres.name).toBe("Show de Teste (Editado)");
      expect(updatedPres.is_public).toBe(true);
    });

    it("should fail to update if user is not the creator", async () => {
      const data = { name: "Show Hackeado" };
      await expect(
        presentation.update(presId, data, regularUser.id),
      ).rejects.toThrow(ForbiddenError);
    });

    it("should fail to delete if user is not the creator", async () => {
      await expect(presentation.del(presId, regularUser.id)).rejects.toThrow(
        ForbiddenError,
      );
    });

    it("should delete the presentation", async () => {
      await expect(presentation.del(presId, adminUser.id)).resolves.toEqual({
        id: presId,
      });

      const foundPres = await presentation.findById(presId);
      expect(foundPres).toBeUndefined();
    });
  });

  describe("findAllForUser()", () => {
    let presByAdmin, presByAluno, presShared;

    beforeAll(async () => {
      // Cria 3 apresentações
      presByAdmin = await presentation.create(
        { name: "Admin Show" },
        adminUser.id,
      );
      presByAluno = await presentation.create(
        { name: "Aluno Show" },
        regularUser.id,
      );
      presShared = await presentation.create(
        { name: "Show Compartilhado" },
        adminUser.id,
      );

      // Adiciona o 'regularUser' ao elenco do show compartilhado
      await presentationViewer.addViewer(presShared.id, regularUser.id);
    });

    it("should find presentations created by AND shared with the user", async () => {
      const alunoPresentations = await presentation.findAllForUser(
        regularUser.id,
      );
      expect(alunoPresentations).toHaveLength(2);
      expect(alunoPresentations.map((p) => p.name)).toContain("Aluno Show");
      expect(alunoPresentations.map((p) => p.name)).toContain(
        "Show Compartilhado",
      );
    });

    it("should find only presentations created by the user if none are shared", async () => {
      const adminPresentations = await presentation.findAllForUser(
        adminUser.id,
      );
      expect(adminPresentations).toHaveLength(2);
      expect(adminPresentations.map((p) => p.name)).toContain("Admin Show");
      expect(adminPresentations.map((p) => p.name)).toContain(
        "Show Compartilhado",
      );
    });
  });

  describe("findDeepById()", () => {
    it("should return the full nested object (presentation > scenes > elements/steps)", async () => {
      const pres = await presentation.create(
        { name: "Deep Show" },
        adminUser.id,
      );
      const scene1 = await scene.create({
        presentation_id: pres.id,
        name: "Musica 1",
        scene_type: "FORMATION",
        order: 1,
      });
      const scene2 = await scene.create({
        presentation_id: pres.id,
        name: "Transicao 1",
        scene_type: "TRANSITION",
        order: 2,
      });

      // Adiciona elementos à Cena 1
      await sceneElement.create({
        scene_id: scene1.id,
        element_type_id: odaikoType.id,
        position_x: 50,
        position_y: 50,
        display_name: "Odaiko",
      });
      // Adiciona passos à Cena 2
      await transitionStep.create({
        scene_id: scene2.id,
        order: 1,
        description: "Correr para o okedo",
      });
      await transitionStep.create({
        scene_id: scene2.id,
        order: 2,
        description: "Pegar baqueta",
        assigned_user_id: regularUser.id,
      });

      const deepPres = await presentation.findDeepById(pres.id);

      expect(deepPres.name).toBe("Deep Show");
      expect(deepPres.scenes).toHaveLength(2);
      expect(deepPres.scenes[0].name).toBe("Musica 1");
      expect(deepPres.scenes[0].scene_elements).toHaveLength(1);
      expect(deepPres.scenes[0].scene_elements[0].display_name).toBe("Odaiko");
      expect(deepPres.scenes[0].scene_elements[0].element_type_name).toBe(
        "Odaiko",
      );
      expect(deepPres.scenes[0].transition_steps).toHaveLength(0); // Cena 1 é FORMATION
      expect(deepPres.scenes[1].name).toBe("Transicao 1");
      expect(deepPres.scenes[1].scene_elements).toHaveLength(0); // Cena 2 é TRANSITION
      expect(deepPres.scenes[1].transition_steps).toHaveLength(2);
      expect(deepPres.scenes[1].transition_steps[1].description).toBe(
        "Pegar baqueta",
      );
    });
  });

  describe("Element Pool and Global Update", () => {
    let pres, scene1, scene2, scene3;

    beforeEach(async () => {
      pres = await presentation.create({ name: "Pool Show" }, adminUser.id);
      scene1 = await scene.create({
        presentation_id: pres.id,
        name: "Musica 1",
        scene_type: "FORMATION",
        order: 1,
      });
      scene2 = await scene.create({
        presentation_id: pres.id,
        name: "Musica 2",
        scene_type: "FORMATION",
        order: 2,
      });
      scene3 = await scene.create({
        presentation_id: pres.id,
        name: "Musica 3",
        scene_type: "FORMATION",
        order: 3,
      });

      // Cria o "Pool"
      // "Renan" (Odaiko) na Cena 1 e 2
      await sceneElement.create({
        scene_id: scene1.id,
        element_type_id: odaikoType.id,
        position_x: 10,
        position_y: 10,
        display_name: "Renan",
        assigned_user_id: regularUser.id,
      });
      await sceneElement.create({
        scene_id: scene2.id,
        element_type_id: odaikoType.id,
        position_x: 20,
        position_y: 20,
        display_name: "Renan",
        assigned_user_id: regularUser.id,
      });
      // "Vi" (Shime) na Cena 1
      await sceneElement.create({
        scene_id: scene1.id,
        element_type_id: shimeType.id,
        position_x: 30,
        position_y: 30,
        display_name: "Vi",
        assigned_user_id: null,
      });
    });

    describe("findElementPool()", () => {
      it("should find distinct elements for the pool", async () => {
        const pool = await presentation.findElementPool(pres.id);

        // Deve encontrar "Renan (Odaiko)" e "Vi (Shime)",
        // ignorando o "Renan (Odaiko)" duplicado
        expect(pool).toHaveLength(2);
        expect(pool.map((p) => p.display_name)).toContain("Renan");
        expect(pool.map((p) => p.display_name)).toContain("Vi");
        expect(pool[0].element_type_name).toBeDefined();
      });
    });

    describe("updateElementGlobally()", () => {
      it("should update all instances of an element across all scenes", async () => {
        const updateData = {
          element_type_id: odaikoType.id, // O tipo de elemento a procurar
          old_display_name: "Renan", // O nome a procurar
          new_display_name: "Lucas", // O novo nome
          new_assigned_user_id: adminUser.id, // O novo usuário
        };

        const result = await presentation.updateElementGlobally(
          pres.id,
          updateData,
        );
        expect(result.updatedCount).toBe(2); // Deve atualizar 2 elementos

        // Verifica se a mudança ocorreu
        const deepPres = await presentation.findDeepById(pres.id);
        const el1 = deepPres.scenes[0].scene_elements.find(
          (e) => e.element_type_id === odaikoType.id,
        );
        const el2 = deepPres.scenes[1].scene_elements.find(
          (e) => e.element_type_id === odaikoType.id,
        );

        expect(el1.display_name).toBe("Lucas");
        expect(el1.assigned_user_id).toBe(adminUser.id);
        expect(el2.display_name).toBe("Lucas");
        expect(el2.assigned_user_id).toBe(adminUser.id);
      });

      it("should fail validation if 'new_display_name' is invalid", async () => {
        const updateData = {
          element_type_id: odaikoType.id,
          old_display_name: "Renan",
          new_display_name: "", // Inválido (muito curto)
        };

        await expect(
          presentation.updateElementGlobally(pres.id, updateData),
        ).rejects.toThrow(ValidationError);
      });
    });
  });
});
