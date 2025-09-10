import orchestrator from "tests/orchestrator.js";
import user from "models/user.js";
import session from "models/session.js";
import comment from "models/comment.js";
import ERROR_MESSAGES from "models/error-messages.js";

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
      await expect(comment.findOne(commentToDelete.id)).rejects.toThrow(
        ERROR_MESSAGES.COMMENT_NOT_FOUND,
      );
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
        body: JSON.stringify({ comment_id: commentToDelete.id }),
      });

      const resBody = await res.json();
      expect(res.status).toBe(200);
      expect(resBody.id).toBe(commentToDelete.id);

      await expect(comment.findOne(commentToDelete.id)).rejects.toThrow(
        expect.objectContaining(ERROR_MESSAGES.COMMENT_NOT_FOUND),
      );
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
