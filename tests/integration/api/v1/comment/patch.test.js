import orchestrator from "tests/orchestrator.js";
import user from "models/user.js";
import session from "models/session.js";
import comment from "models/comment.js";
import commentLike from "models/comment-like.js";

describe("PATCH /api/v1/comment", () => {
  let ownerUser, adminUser, regularUser;
  let commentToUpdate, otherCommentOnSameVideo;

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

    const videoId = "video-patch-1";
    commentToUpdate = await comment.create(
      { content: "Original content", video_id: videoId },
      ownerUser,
    );

    otherCommentOnSameVideo = await comment.create(
      { content: "Another comment", video_id: videoId },
      regularUser,
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

    it("should return 'liked_by_user: true' when updating a comment liked by the requester", async () => {
      // O ownerUser será o requisitante
      const newSession = await session.create(ownerUser);
      await commentLike.like({ comment_id: commentToUpdate.id }, ownerUser);

      const res = await fetch(`${orchestrator.webserverUrl}/api/v1/comment`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          cookie: `session_id=${newSession.token}`,
        },
        body: JSON.stringify({
          comment_id: commentToUpdate.id,
          content: "Updated while liked by me",
        }),
      });

      const resBody = await res.json();
      expect(res.status).toBe(200);
      expect(resBody.content).toBe("Updated while liked by me");
      expect(resBody.likes_count).toBe("1");
      expect(resBody.liked_by_user).toBe(true);
    });

    it("should return 'liked_by_user: false' when updating a comment liked by another user", async () => {
      // Limpa o like anterior e adiciona um novo do 'regularUser'
      await orchestrator.clearTable("comment_likes");
      await commentLike.like({ comment_id: commentToUpdate.id }, regularUser);

      const newSession = await session.create(ownerUser); // ownerUser ainda é o requisitante

      const res = await fetch(`${orchestrator.webserverUrl}/api/v1/comment`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          cookie: `session_id=${newSession.token}`,
        },
        body: JSON.stringify({
          comment_id: commentToUpdate.id,
          content: "Updated while liked by other",
        }),
      });

      const resBody = await res.json();
      expect(res.status).toBe(200);
      expect(resBody.content).toBe("Updated while liked by other");
      expect(resBody.likes_count).toBe("1");
      expect(resBody.liked_by_user).toBe(false);
    });

    it("should return the full, ordered list of comments when 'return_list' is true", async () => {
      // Setup: Limpa likes anteriores e adiciona um like ao 'otherComment' para testar a ordem.
      await orchestrator.clearTable("comment_likes");
      await commentLike.like(
        { comment_id: otherCommentOnSameVideo.id },
        adminUser,
      );

      const newSession = await session.create(ownerUser); // O 'ownerUser' vai editar seu próprio comentário

      const res = await fetch(`${orchestrator.webserverUrl}/api/v1/comment`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          cookie: `session_id=${newSession.token}`,
        },
        body: JSON.stringify({
          comment_id: commentToUpdate.id,
          content: "Updated and requesting list",
          return_list: true,
        }),
      });

      const resBody = await res.json();

      expect(res.status).toBe(200);
      expect(Array.isArray(resBody)).toBe(true);
      expect(resBody).toHaveLength(2);

      // Verifica a ordenação por engajamento (o outro comentário tem 1 like, deve vir primeiro)
      expect(resBody[0].content).toBe("Another comment");
      expect(resBody[1].content).toBe("Updated and requesting list");

      // Verifica o 'liked_by_user' da perspectiva do 'ownerUser'
      expect(resBody[0].liked_by_user).toBe(false); // Curtido pelo admin, não pelo owner
      expect(resBody[1].liked_by_user).toBe(false); // Sem curtidas
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
