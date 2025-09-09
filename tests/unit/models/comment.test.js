import comment from "models/comment.js";
import user from "models/user.js";
import orchestrator from "tests/orchestrator.js";
import { NotFoundError, ValidationError } from "errors/index.js";
import ERROR_MESSAGES from "models/error-messages.js";

describe("Comment Model", () => {
  let createdUser;

  beforeAll(async () => {
    await orchestrator.waitForAllServices();
    await orchestrator.clearDatabase();
    await orchestrator.runPendingMigrations();

    // Cria um utilizador para ser o autor dos comentários
    createdUser = await user.create({
      username: "commenter",
      email: "commenter@test.com",
      password: "StrongPassword123@",
    });
  });

  describe("create", () => {
    it("should create a new top-level comment with valid data", async () => {
      const commentData = {
        content: "Este é um comentário de teste.",
        video_id: "video123",
        user_id: createdUser.id,
      };
      const newComment = await comment.create(commentData);
      expect(newComment.content).toBe("Este é um comentário de teste.");
      expect(newComment.user_id).toBe(createdUser.id);
      expect(newComment.video_id).toBe("video123");
      expect(newComment.parent_id).toBeNull();
    });

    it("should create a reply to another comment", async () => {
      const parentComment = await comment.create({
        content: "Parent",
        video_id: "video123",
        user_id: createdUser.id,
      });
      const replyData = {
        content: "Esta é uma resposta.",
        video_id: "video123",
        parent_id: parentComment.id,
        user_id: createdUser.id,
      };
      const replyComment = await comment.create(replyData);
      expect(replyComment.content).toBe("Esta é uma resposta.");
      expect(replyComment.parent_id).toBe(parentComment.id);
    });

    it("should throw ValidationError if 'content' is missing", async () => {
      const commentData = { video_id: "video123", user_id: createdUser.id };
      await expect(comment.create(commentData)).rejects.toThrow(
        ValidationError,
      );
    });
  });

  describe("findByVideoId", () => {
    it("should return an array of comments for a given video_id", async () => {
      await comment.create({
        content: "Comentário para video456",
        video_id: "video456",
        user_id: createdUser.id,
      });
      const comments = await comment.findByVideoId("video456");
      expect(Array.isArray(comments)).toBe(true);
      expect(comments.length).toBeGreaterThan(0);
      expect(comments[0].username).toBe("commenter");
      expect(comments[0]).toHaveProperty("likes_count");
    });

    it("should return an empty array for a video_id with no comments", async () => {
      const comments = await comment.findByVideoId("video_with_no_comments");
      expect(comments).toEqual([]);
    });
  });

  describe("update", () => {
    it("should update the content of an existing comment", async () => {
      const myComment = await comment.create({
        content: "Conteúdo original",
        video_id: "video789",
        user_id: createdUser.id,
      });
      const updatedData = {
        comment_id: myComment.id,
        content: "Conteúdo atualizado",
      };
      const updatedComment = await comment.update(updatedData);
      expect(updatedComment.content).toBe("Conteúdo atualizado");
    });

    it("should throw NotFoundError when trying to update a non-existent comment", async () => {
      const nonExistentId = orchestrator.generateRandomUUIDV4();
      const updateData = { comment_id: nonExistentId, content: "novo texto" };
      await expect(comment.update(updateData)).rejects.toThrow(
        expect.objectContaining(ERROR_MESSAGES.COMMENT_NOT_FOUND),
      );
    });
  });

  describe("del", () => {
    it("should soft delete a comment", async () => {
      const myComment = await comment.create({
        content: "Para ser apagado",
        video_id: "videoABC",
        user_id: createdUser.id,
      });
      const result = await comment.del(myComment.id);
      expect(result.id).toBe(myComment.id);

      // Tenta encontrar o comentário apagado e espera um erro
      await expect(comment.findOne(myComment.id)).rejects.toThrow(
        NotFoundError,
      );
    });

    it("should throw NotFoundError when trying to delete a non-existent comment", async () => {
      const nonExistentId = orchestrator.generateRandomUUIDV4();
      await expect(comment.del(nonExistentId)).rejects.toThrow(
        expect.objectContaining(ERROR_MESSAGES.COMMENT_NOT_FOUND),
      );
    });
  });

  describe("findOne", () => {
    it("should find and return a single comment by its ID", async () => {
      const newComment = await comment.create({
        content: "Comentário para encontrar",
        video_id: "find-me",
        user_id: createdUser.id,
      });
      const foundComment = await comment.findOne(newComment.id);
      expect(foundComment.id).toBe(newComment.id);
      expect(foundComment.content).toBe("Comentário para encontrar");
    });

    it("should throw NotFoundError for a non-existent ID", async () => {
      const nonExistentId = orchestrator.generateRandomUUIDV4();
      await expect(comment.findOne(nonExistentId)).rejects.toThrow(
        NotFoundError,
      );
    });
  });
});
