import orchestrator from "tests/orchestrator.js";
import user from "models/user.js";
import session from "models/session.js";
import comment from "models/comment.js";
import { settings } from "config/settings.js";

describe("PATCH /api/v1/comment", () => {
  let ownerUser, adminUser, regularUser;
  let commentToUpdate;

  beforeAll(async () => {
    await orchestrator.waitForAllServices();
    await orchestrator.clearDatabase();
    await orchestrator.runPendingMigrations();

    ownerUser = await user.create({
      username: "owner",
      email: "owner@test.com",
      password: "StrongPassword123@",
    });

    ownerUser = await user.update({
      id: ownerUser.id,
      password: "StrongPassword123@",
    });

    adminUser = await user.create({
      username: "mainUser2",
      email: "admin@test.com",
      password: "StrongPassword123@",
    });

    adminUser = await user.update({
      id: adminUser.id,
      password: "StrongPassword123@",
    });

    regularUser = await user.create({
      username: "regular",
      email: "regular@test.com",
      password: "StrongPassword123@",
    });

    regularUser = await user.update({
      id: regularUser.id,
      password: "StrongPassword123@",
    });

    // Adiciona a permissão de admin ao adminUser
    await user.addFeatures(adminUser, ["update:other:comment"]);

    // Cria um comentário que será o alvo das atualizações
    commentToUpdate = await comment.create(
      {
        content: "Original content",
        video_id: "video-patch-1",
      },
      ownerUser,
    );
  });

  describe("Authenticated User", () => {
    it("should allow a user with 'update:self:comment' to update their own comment", async () => {
      const newSession = await session.create(ownerUser);
      const res = await fetch(`${orchestrator.webserverUrl}/api/v1/comment`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          cookie: `session_id=${newSession.token}`,
        },
        body: JSON.stringify({
          comment_id: commentToUpdate.id,
          content: "Updated by owner",
        }),
      });
      const resBody = await res.json();
      expect(res.status).toBe(200);
      expect(resBody.content).toBe("Updated by owner");
      expect(resBody.username).toBe(ownerUser.username); // Verifica o enriquecimento
    });

    it("should NOT allow a user to update self user's comment without 'update:self:comment' feature", async () => {
      await user.removeFeatures(ownerUser, ["update:self:comment"]);
      await user.addFeatures(ownerUser, ["update:other:comment"]);
      const newSession = await session.create(ownerUser);
      const res = await fetch(`${orchestrator.webserverUrl}/api/v1/comment`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          cookie: `session_id=${newSession.token}`,
        },
        body: JSON.stringify({
          comment_id: commentToUpdate.id,
          content: "Trying to hack",
        }),
      });
      const resBody = await res.json();
      expect(res.status).toBe(403);
      expect(resBody.name).toBe("ForbiddenError");
      await user.addFeatures(ownerUser, ["update:self:comment"]);
      await user.removeFeatures(ownerUser, ["update:other:comment"]);
    });

    it("should NOT allow a user to update another user's comment without 'update:other:comment' feature", async () => {
      const newSession = await session.create(regularUser);
      const res = await fetch(`${orchestrator.webserverUrl}/api/v1/comment`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          cookie: `session_id=${newSession.token}`,
        },
        body: JSON.stringify({
          comment_id: commentToUpdate.id,
          content: "Trying to hack",
        }),
      });
      const resBody = await res.json();
      expect(res.status).toBe(403);
      expect(resBody.name).toBe("ForbiddenError");
    });

    it("should ALLOW a user with 'update:other:comment' to update another user's comment", async () => {
      await user.addFeatures(adminUser, ["delete:self:comment"]);
      const newSession = await session.create(adminUser);
      const res = await fetch(`${orchestrator.webserverUrl}/api/v1/comment`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          cookie: `session_id=${newSession.token}`,
        },
        body: JSON.stringify({
          comment_id: commentToUpdate.id,
          content: "Updated by admin",
        }),
      });
      const resBody = await res.json();
      expect(res.status).toBe(200);
      expect(resBody.content).toBe("Updated by admin");
      expect(resBody.username).toBe(ownerUser.username); // Verifica que o autor original foi mantido
    });
  });

  describe("Error Handling", () => {
    it("should return 404 Not Found for a non-existent comment_id", async () => {
      const newSession = await session.create(adminUser);
      const nonExistentId = orchestrator.generateRandomUUIDV4();
      const res = await fetch(`${orchestrator.webserverUrl}/api/v1/comment`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          cookie: `session_id=${newSession.token}`,
        },
        body: JSON.stringify({
          comment_id: nonExistentId,
          content: "Does not matter",
        }),
      });
      const resBody = await res.json();
      expect(res.status).toBe(404);
      expect(resBody.name).toBe("NotFoundError");
    });

    it("should return 400 Bad Request if 'content' is missing", async () => {
      const newSession = await session.create(ownerUser);
      const res = await fetch(`${orchestrator.webserverUrl}/api/v1/comment`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          cookie: `session_id=${newSession.token}`,
        },
        body: JSON.stringify({ comment_id: commentToUpdate.id }),
      });
      const resBody = await res.json();
      expect(res.status).toBe(400);
      expect(resBody.name).toBe("ValidationError");
    });

    it("should return 403 PasswordExpiredError if the user's password has expired", async () => {
      const expiredUser = await user.expireUserPassword(ownerUser);
      const newSession = await session.create(expiredUser);
      const res = await fetch(`${orchestrator.webserverUrl}/api/v1/comment`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          cookie: `session_id=${newSession.token}`,
        },
        body: JSON.stringify({
          comment_id: commentToUpdate.id,
          content: "Trying to update with expired password",
        }),
      });
      const resBody = await res.json();
      expect(res.status).toBe(403);
      expect(resBody.name).toBe("PasswordExpiredError");
    });
  });

  describe("Anonymous User", () => {
    it("should return 403 Forbidden", async () => {
      const res = await fetch(`${orchestrator.webserverUrl}/api/v1/comment`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          comment_id: commentToUpdate.id,
          content: "Anonymous update",
        }),
      });
      const resBody = await res.json();
      expect(res.status).toBe(403);
      expect(resBody.name).toBe("ForbiddenError");
    });
  });
});
