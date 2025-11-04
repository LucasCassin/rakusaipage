import orchestrator from "tests/orchestrator.js";
import presentation from "models/presentation.js";
import presentationViewer from "models/presentation_viewer.js";
import user from "models/user.js";
import { ValidationError, NotFoundError } from "errors/index.js";

describe("Presentation Viewer Model", () => {
  let testUser, testUser2, testPresentation;

  beforeAll(async () => {
    await orchestrator.waitForAllServices();
    await orchestrator.clearDatabase();
    await orchestrator.runPendingMigrations();

    // Cria usuários
    const adminUser = await user.findOneUser({ username: "mainUser" });
    testUser = await user.create({
      username: "viewerUser1",
      email: "viewer1@test.com",
      password: "StrongPassword123@",
    });
    testUser2 = await user.create({
      username: "viewerUser2",
      email: "viewer2@test.com",
      password: "StrongPassword123@",
    });

    // Cria uma apresentação
    testPresentation = await presentation.create(
      { name: "Show do Elenco" },
      adminUser.id,
    );
  });

  describe("addViewer()", () => {
    it("should add a user to the presentation cast", async () => {
      const viewer = await presentationViewer.addViewer(
        testPresentation.id,
        testUser.id,
      );
      expect(viewer.presentation_id).toBe(testPresentation.id);
      expect(viewer.user_id).toBe(testUser.id);
    });

    it("should not throw an error or create a duplicate if the user is added again", async () => {
      // Adiciona pela primeira vez
      await presentationViewer.addViewer(testPresentation.id, testUser2.id);
      // Tenta adicionar de novo
      const duplicate = await presentationViewer.addViewer(
        testPresentation.id,
        testUser2.id,
      );

      // A query 'ON CONFLICT DO NOTHING' deve retornar undefined/null
      expect(duplicate).toBeUndefined();
    });

    it("should fail with ValidationError for invalid UUIDs", async () => {
      await expect(
        presentationViewer.addViewer(testPresentation.id, "invalid-uuid"),
      ).rejects.toThrow(ValidationError);
      await expect(
        presentationViewer.addViewer("invalid-uuid", testUser.id),
      ).rejects.toThrow(ValidationError);
    });
  });

  describe("findByPresentationId()", () => {
    it("should return all users in the cast for a presentation", async () => {
      // (testUser e testUser2 já foram adicionados no describe anterior)
      const viewers = await presentationViewer.findByPresentationId(
        testPresentation.id,
      );

      expect(viewers).toHaveLength(2);
      expect(viewers.map((v) => v.username)).toContain("viewerUser1");
      expect(viewers.map((v) => v.username)).toContain("viewerUser2");
    });

    it("should return an empty array for a presentation with no viewers", async () => {
      const newUser = await user.create({
        username: "lonelyUser",
        email: "lonely@test.com",
        password: "StrongPassword123@",
      });
      const newPres = await presentation.create(
        { name: "Show Vazio" },
        newUser.id,
      );

      const viewers = await presentationViewer.findByPresentationId(newPres.id);
      expect(viewers).toHaveLength(0);
    });
  });

  describe("removeViewer()", () => {
    it("should remove a user from the presentation cast", async () => {
      // Remove testUser (adicionado no primeiro describe)
      const removed = await presentationViewer.removeViewer(
        testPresentation.id,
        testUser.id,
      );
      expect(removed.id).toBeDefined();

      // Verifica se ele foi removido
      const viewers = await presentationViewer.findByPresentationId(
        testPresentation.id,
      );
      expect(viewers).toHaveLength(1);
      expect(viewers[0].username).toBe("viewerUser2");
    });

    it("should throw NotFoundError if trying to remove a user that is not in the cast", async () => {
      // (testUser já foi removido)
      await expect(
        presentationViewer.removeViewer(testPresentation.id, testUser.id),
      ).rejects.toThrow(NotFoundError);
    });
  });
});
