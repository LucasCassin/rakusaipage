import commentLike from "models/comment-like.js";
import comment from "models/comment.js";
import user from "models/user.js";
import orchestrator from "tests/orchestrator.js";
import { NotFoundError, ValidationError } from "errors/index.js";
import ERROR_MESSAGES from "models/error-messages.js";

describe("Comment-Like Model", () => {
  let user1, user2, testComment;

  beforeAll(async () => {
    await orchestrator.waitForAllServices();
    await orchestrator.clearDatabase();
    await orchestrator.runPendingMigrations();

    user1 = await user.create({
      username: "liker1",
      email: "liker1@test.com",
      password: "StrongPassword123@",
    });

    user2 = await user.create({
      username: "liker2",
      email: "liker2@test.com",
      password: "StrongPassword123@",
    });

    testComment = await comment.create({
      content: "Comentário para curtir",
      video_id: "like-video",
      user_id: user1.id,
    });
  });

  describe("like and unlike", () => {
    it("should allow a user to like a comment", async () => {
      const result = await commentLike.like(
        { comment_id: testComment.id },
        user2,
      );
      expect(result.comment_id).toBe(testComment.id);

      const likes = await commentLike.findLikesByCommentId(testComment.id);
      expect(likes).toContain(user2.id);
    });

    it("should not fail if a user tries to like the same comment twice", async () => {
      await commentLike.like({ comment_id: testComment.id }, user2); // Primeira curtida
      await expect(
        commentLike.like({ comment_id: testComment.id }, user2),
      ).resolves.not.toThrow();

      const likes = await commentLike.findLikesByCommentId(testComment.id);
      // Garante que não há duplicatas
      expect(likes.filter((id) => id === user2.id)).toHaveLength(1);
    });

    it("should allow a user to unlike a comment", async () => {
      await commentLike.like({ comment_id: testComment.id }, user1); // Garante que a curtida existe
      const result = await commentLike.unlike(
        { comment_id: testComment.id },
        user1,
      );
      expect(result.comment_id).toBe(testComment.id);

      const likes = await commentLike.findLikesByCommentId(testComment.id);
      expect(likes).not.toContain(user1.id);
    });

    it("should not fail if a user tries to unlike a comment they haven't liked", async () => {
      // Garante que o user1 não curtiu antes de tentar descurtir
      await commentLike.unlike({ comment_id: testComment.id }, user1);
      await expect(
        commentLike.unlike({ comment_id: testComment.id }, user1),
      ).resolves.not.toThrow();
    });
  });

  describe("findLikesByCommentId", () => {
    it("should return an array of user IDs who liked the comment", async () => {
      await commentLike.like({ comment_id: testComment.id }, user1);
      await commentLike.like({ comment_id: testComment.id }, user2);

      const likes = await commentLike.findLikesByCommentId(testComment.id);
      expect(likes).toHaveLength(2);
      expect(likes).toContain(user1.id);
      expect(likes).toContain(user2.id);

      // Limpeza para os próximos testes
      await commentLike.unlike({ comment_id: testComment.id }, user1);
      await commentLike.unlike({ comment_id: testComment.id }, user2);
    });

    it("should return an empty array if a comment has no likes", async () => {
      const lonelyComment = await comment.create({
        content: "Sem curtidas",
        video_id: "lonely-video",
        user_id: user1.id,
      });
      const likes = await commentLike.findLikesByCommentId(lonelyComment.id);
      expect(likes).toEqual([]);
    });
  });

  describe("Error Handling", () => {
    it("should throw NotFoundError with correct message when trying to like a non-existent comment", async () => {
      const nonExistentCommentId = orchestrator.generateRandomUUIDV4();
      await expect(
        commentLike.like({ comment_id: nonExistentCommentId }, user1),
      ).rejects.toThrow(
        expect.objectContaining(ERROR_MESSAGES.COMMENT_NOT_FOUND),
      );
    });

    it("should throw NotFoundError with correct message when trying to unlike a non-existent comment", async () => {
      const nonExistentCommentId = orchestrator.generateRandomUUIDV4();
      await expect(
        commentLike.unlike({ comment_id: nonExistentCommentId }, user1),
      ).rejects.toThrow(
        expect.objectContaining(ERROR_MESSAGES.COMMENT_NOT_FOUND),
      );
    });

    it("should throw ValidationError if 'comment_id' is not a valid UUID", async () => {
      await expect(
        commentLike.like({ comment_id: "invalid-uuid" }, user1),
      ).rejects.toThrow(ValidationError);
    });
  });
});
