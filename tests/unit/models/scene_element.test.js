import orchestrator from "tests/orchestrator.js";
import presentation from "models/presentation.js";
import scene from "models/scene.js";
import elementType from "models/element_type.js";
import sceneElement from "models/scene_element.js"; // O modelo que estamos testando
import user from "models/user.js";
import { ValidationError, NotFoundError } from "errors/index.js";

describe("Scene Element Model", () => {
  let adminUser, testPresentation, testScene, odaikoType, testUser;

  beforeAll(async () => {
    await orchestrator.waitForAllServices();
    await orchestrator.clearDatabase();
    await orchestrator.runPendingMigrations();

    // Setup: 1 Usuário, 1 Apresentação, 1 Cena, 1 Tipo de Elemento
    adminUser = await user.findOneUser({ username: "mainUser" });
    testUser = await user.create({
      username: "alunoElemento",
      email: "elemento@test.com",
      password: "StrongPassword123@",
    });

    testPresentation = await presentation.create(
      { name: "Show de Elementos" },
      adminUser.id,
    );

    testScene = await scene.create({
      presentation_id: testPresentation.id,
      name: "Música com Elementos",
      scene_type: "FORMATION",
      order: 1,
    });

    odaikoType = await elementType.create({
      name: "Odaiko",
      image_url: "/icons/odaiko.svg",
    });
  });

  describe("create()", () => {
    it("should create a new scene element", async () => {
      const data = {
        scene_id: testScene.id,
        element_type_id: odaikoType.id,
        position_x: 50.5,
        position_y: 75.0,
        display_name: "Lucas",
        assigned_user_id: testUser.id,
      };
      const newElement = await sceneElement.create(data);

      expect(newElement.id).toBeDefined();
      expect(newElement.scene_id).toBe(testScene.id);
      expect(newElement.display_name).toBe("Lucas");
      expect(newElement.position_x).toBe(50.5);
      expect(newElement.assigned_user_id).toBe(testUser.id);
    });

    it("should fail with ValidationError if 'scene_id' is missing", async () => {
      const data = {
        element_type_id: odaikoType.id,
        position_x: 50,
        position_y: 50,
      };
      await expect(sceneElement.create(data)).rejects.toThrow(ValidationError);
    });

    it("should fail with ValidationError if 'position_x' is out of bounds (0-100)", async () => {
      const data = {
        scene_id: testScene.id,
        element_type_id: odaikoType.id,
        position_x: 101.0, // Inválido
        position_y: 50,
      };
      // O validator.js deve pegar isso
      await expect(sceneElement.create(data)).rejects.toThrow(ValidationError);
    });
  });

  describe("update() and del()", () => {
    let elementToEdit;

    beforeAll(async () => {
      // Cria um elemento para ser usado nos testes
      const data = {
        scene_id: testScene.id,
        element_type_id: odaikoType.id,
        position_x: 10,
        position_y: 10,
        display_name: "Original",
      };
      elementToEdit = await sceneElement.create(data);
    });

    it("should update an element's position", async () => {
      const updateData = {
        position_x: 11.5,
        position_y: 12.5,
      };
      const updatedElement = await sceneElement.update(
        elementToEdit.id,
        updateData,
      );

      expect(updatedElement.id).toBe(elementToEdit.id);
      expect(updatedElement.position_x).toBe(11.5);
      expect(updatedElement.position_y).toBe(12.5);
      expect(updatedElement.display_name).toBe("Original"); // Não mudou
    });

    it("should update an element's assignment (name and user)", async () => {
      const updateData = {
        display_name: "Novo Nome",
        assigned_user_id: adminUser.id,
      };
      const updatedElement = await sceneElement.update(
        elementToEdit.id,
        updateData,
      );

      expect(updatedElement.display_name).toBe("Novo Nome");
      expect(updatedElement.assigned_user_id).toBe(adminUser.id);
      expect(updatedElement.position_x).toBe(11.5); // Permanece da edição anterior
    });

    it("should allow un-assigning a user (setting to null)", async () => {
      const updateData = {
        assigned_user_id: null,
      };
      const updatedElement = await sceneElement.update(
        elementToEdit.id,
        updateData,
      );
      expect(updatedElement.assigned_user_id).toBeNull();
    });

    it("should throw NotFoundError when updating a non-existent element", async () => {
      const randomId = orchestrator.generateRandomUUIDV4();
      await expect(
        sceneElement.update(randomId, { position_x: 0 }),
      ).rejects.toThrow(NotFoundError);
    });

    it("should delete an element", async () => {
      const deleted = await sceneElement.del(elementToEdit.id);
      expect(deleted.id).toBe(elementToEdit.id);

      // Verifica se foi deletado
      const found = await sceneElement.findById(elementToEdit.id);
      expect(found).toBeUndefined();
    });

    it("should throw NotFoundError when deleting a non-existent element", async () => {
      const randomId = orchestrator.generateRandomUUIDV4();
      await expect(sceneElement.del(randomId)).rejects.toThrow(NotFoundError);
    });
  });
});
