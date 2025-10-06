import orchestrator from "tests/orchestrator.js";
import user from "models/user.js";
import session from "models/session.js";
import comment from "models/comment.js";
import ERROR_MESSAGES from "models/error-messages.js";
import commentLike from "models/comment-like";

describe("DELETE /api/v1/comment", () => {
  let ownerUser, adminUser, regularUser;

  beforeAll(async () => {
    await orchestrator.waitForAllServices();
    await orchestrator.clearDatabase();
    await orchestrator.runPendingMigrations();

    ownerUser = await user.create({
      username: "ownerDelete",
      email: "ownerDelete@test.com",
      password: "StrongPassword123@",
    });
    ownerUser = await user.update({
      id: ownerUser.id,
      password: "StrongPassword123@",
    });
    adminUser = await user.create({
      username: "adminDelete",
      email: "adminDelete@test.com",
      password: "StrongPassword123@",
    });
    adminUser = await user.update({
      id: adminUser.id,
      password: "StrongPassword123@",
    });
    regularUser = await user.create({
      username: "regularDelete",
      email: "regularDelete@test.com",
      password: "StrongPassword123@",
    });
    regularUser = await user.update({
      id: regularUser.id,
      password: "StrongPassword123@",
    });

    await user.addFeatures(adminUser, ["delete:other:comment"]);
  });

  describe("Authenticated User", () => {
    it("should allow a user with 'delete:self:comment' to delete their own comment", async () => {
      const commentToDelete = await comment.create(
        { content: "To be deleted by self", video_id: "video-del-1" },
        ownerUser,
      );
      const newSession = await session.create(ownerUser);

      const res = await fetch(`${orchestrator.webserverUrl}/api/v1/comment`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          cookie: `session_id=${newSession.token}`,
        },
        body: JSON.stringify({ comment_id: commentToDelete.id }),
      });

      const resBody = await res.json();
      expect(res.status).toBe(200);
      expect(resBody.id).toBe(commentToDelete.id);

      // Verifica se o comentário foi realmente apagado (soft delete)
      await expect(
        comment.findOne(commentToDelete.id, ownerUser),
      ).rejects.toThrow(ERROR_MESSAGES.COMMENT_NOT_FOUND);
    });

    it("should NOT allow a a user without 'delete:self:comment' to delete their own comment", async () => {
      const commentToDelete = await comment.create(
        { content: "Protected comment", video_id: "video-del-2" },
        ownerUser,
      );
      const newSession = await session.create(ownerUser);
      await user.removeFeatures(ownerUser, ["delete:self:comment"]);
      await user.addFeatures(ownerUser, ["delete:other:comment"]);

      const res = await fetch(`${orchestrator.webserverUrl}/api/v1/comment`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          cookie: `session_id=${newSession.token}`,
        },
        body: JSON.stringify({ comment_id: commentToDelete.id }),
      });

      const resBody = await res.json();
      expect(res.status).toBe(403);
      expect(resBody.name).toBe("ForbiddenError");
      await user.addFeatures(ownerUser, ["delete:self:comment"]);
      await user.removeFeatures(ownerUser, ["delete:other:comment"]);
    });

    it("should NOT allow a regular user to delete another user's comment", async () => {
      const commentToDelete = await comment.create(
        { content: "Protected comment", video_id: "video-del-2" },
        ownerUser,
      );
      const newSession = await session.create(regularUser);

      const res = await fetch(`${orchestrator.webserverUrl}/api/v1/comment`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          cookie: `session_id=${newSession.token}`,
        },
        body: JSON.stringify({ comment_id: commentToDelete.id }),
      });

      const resBody = await res.json();
      expect(res.status).toBe(403);
      expect(resBody.name).toBe("ForbiddenError");
    });

    it("should ALLOW an admin with 'delete:other:comment' to delete another user's comment", async () => {
      await user.addFeatures(adminUser, ["delete:self:comment"]);
      const commentToDelete = await comment.create(
        { content: "To be deleted by admin", video_id: "video-del-3" },
        ownerUser,
      );
      const newSession = await session.create(adminUser);

      const res = await fetch(`${orchestrator.webserverUrl}/api/v1/comment`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          cookie: `session_id=${newSession.token}`,
        },
        body: JSON.stringify({
          comment_id: commentToDelete.id,
        }),
      });

      const resBody = await res.json();
      expect(res.status).toBe(200);
      expect(resBody.id).toBe(commentToDelete.id);

      await expect(
        comment.findOne(commentToDelete.id, adminUser),
      ).rejects.toThrow(
        expect.objectContaining(ERROR_MESSAGES.COMMENT_NOT_FOUND),
      );
    });

    it("should return the remaining list of comments, correctly ordered, when 'return_list' is true", async () => {
      const videoId = "video-del-list-order-test";
      // Setup: Cria 3 comentários para este teste
      const commentToDelete = await comment.create(
        { content: "Delete me!", video_id: videoId },
        ownerUser,
      );
      const lowEngagementComment = await comment.create(
        { content: "I have no likes", video_id: videoId },
        regularUser,
      );
      const highEngagementComment = await comment.create(
        { content: "I have one like", video_id: videoId },
        regularUser,
      );

      // MUDANÇA: Adiciona um like para definir a ordem
      await commentLike.like(
        { comment_id: highEngagementComment.id },
        adminUser,
      );

      const newSession = await session.create(ownerUser); // 'ownerUser' deleta o seu próprio comentário

      const res = await fetch(`${orchestrator.webserverUrl}/api/v1/comment`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          cookie: `session_id=${newSession.token}`,
        },
        body: JSON.stringify({
          comment_id: commentToDelete.id,
          return_list: true,
        }),
      });

      const resBody = await res.json();

      expect(res.status).toBe(200);
      expect(Array.isArray(resBody)).toBe(true);
      expect(resBody).toHaveLength(2);

      // MUDANÇA: Verifica a ordenação por engajamento
      expect(resBody[0].id).toBe(highEngagementComment.id);
      expect(resBody[1].id).toBe(lowEngagementComment.id);

      // Verifica se os dados da lista retornada estão enriquecidos corretamente
      expect(resBody[0].likes_count).toBe("1");
      expect(resBody[0].liked_by_user).toBe(false); // O like foi do 'adminUser', não do 'ownerUser' (requisitante)
    });
  });

  describe("Error Handling", () => {
    it("should return 404 Not Found for a non-existent comment_id", async () => {
      const newSession = await session.create(adminUser);
      const nonExistentId = orchestrator.generateRandomUUIDV4();

      const res = await fetch(`${orchestrator.webserverUrl}/api/v1/comment`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          cookie: `session_id=${newSession.token}`,
        },
        body: JSON.stringify({ comment_id: nonExistentId }),
      });

      const resBody = await res.json();
      expect(res.status).toBe(404);
      expect(resBody.name).toBe("NotFoundError");
    });

    it("should return 400 Bad Request if 'comment_id' is missing", async () => {
      const newSession = await session.create(ownerUser);
      const res = await fetch(`${orchestrator.webserverUrl}/api/v1/comment`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          cookie: `session_id=${newSession.token}`,
        },
        body: JSON.stringify({}),
      });

      const resBody = await res.json();
      expect(res.status).toBe(400);
      expect(resBody.name).toBe("ValidationError");
    });
  });

  describe("Anonymous User", () => {
    it("should return 403 Forbidden", async () => {
      const commentToDelete = await comment.create(
        { content: "Anonymous cannot delete", video_id: "video-del-anon" },
        ownerUser,
      );
      const res = await fetch(`${orchestrator.webserverUrl}/api/v1/comment`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment_id: commentToDelete.id }),
      });

      const resBody = await res.json();
      expect(res.status).toBe(403);
      expect(resBody.name).toBe("ForbiddenError");
    });
  });
});
