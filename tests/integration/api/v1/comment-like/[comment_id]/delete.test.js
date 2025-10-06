import orchestrator from "tests/orchestrator.js";
import user from "models/user.js";
import session from "models/session.js";
import comment from "models/comment.js";
import likeModel from "models/comment-like.js";
import { v4 as uuid } from "uuid";

describe("DELETE /api/v1/comment-like/:commentId", () => {
  let commentOwner, likingUser, testComment, otherTestComment;

  beforeAll(async () => {
    await orchestrator.waitForAllServices();
    await orchestrator.clearDatabase();
    await orchestrator.runPendingMigrations();

    commentOwner = await user.create({
      username: "commentOwnerDel",
      email: "ownerDel@test.com",
      password: "StrongPassword123@",
    });

    commentOwner = await user.update({
      id: commentOwner.id,
      password: "StrongPassword123@",
    });

    likingUser = await user.create({
      username: "likingUserDel",
      email: "likerDel@test.com",
      password: "StrongPassword123@",
    });

    likingUser = await user.update({
      id: likingUser.id,
      password: "StrongPassword123@",
    });

    testComment = await comment.create(
      {
        content: "Comment to be unliked",
        video_id: "video-likes-2",
      },
      commentOwner,
    );

    otherTestComment = await comment.create(
      {
        content: "Comment to be unliked 2",
        video_id: "video-likes-2",
      },
      commentOwner,
    );
  });

  describe("Authenticated User", () => {
    beforeEach(async () => {
      // Garante que o comentário sempre tem 1 like antes de cada teste começar.
      // Isso isola os testes uns dos outros.
      await likeModel.like({ comment_id: testComment.id }, likingUser);
    });
    it("should allow a user to unlike a comment and return the updated like count", async () => {
      const newSession = await session.create(likingUser);
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/comment-like/${testComment.id}`,
        {
          method: "DELETE",
          headers: {
            cookie: `session_id=${newSession.token}`,
          },
        },
      );

      const resBody = await res.json();
      expect(res.status).toBe(200);
      expect(resBody).toEqual({
        comment_id: testComment.id,
        likes_count: 0,
      });
    });

    it("should allow a user to unlike a comment and return the updated like count 2", async () => {
      await likeModel.like({ comment_id: otherTestComment.id }, commentOwner);
      await likeModel.like({ comment_id: otherTestComment.id }, likingUser);
      const newSession = await session.create(likingUser);
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/comment-like/${otherTestComment.id}`,
        {
          method: "DELETE",
          headers: {
            cookie: `session_id=${newSession.token}`,
          },
        },
      );

      const resBody = await res.json();
      expect(res.status).toBe(200);
      expect(resBody).toEqual({
        comment_id: otherTestComment.id,
        likes_count: 1,
      });
    });

    it("should be idempotent, returning the same like count if the user unlikes again", async () => {
      const newSession = await session.create(likingUser);
      await fetch(
        `${orchestrator.webserverUrl}/api/v1/comment-like/${testComment.id}`,
        {
          method: "DELETE",
          headers: { cookie: `session_id=${newSession.token}` },
        },
      );

      // Segunda remoção (teste de idempotência)
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/comment-like/${testComment.id}`,
        {
          method: "DELETE",
          headers: { cookie: `session_id=${newSession.token}` },
        },
      );

      const resBody = await res.json();
      expect(res.status).toBe(200);
      expect(resBody.likes_count).toBe(0);
    });

    it("should return 403 Forbidden if the user does not have the 'unlike:comment' feature", async () => {
      // Adiciona o like de volta para ter o que tentar remover
      await likeModel.like({ comment_id: testComment.id }, likingUser);

      try {
        await user.removeFeatures(likingUser, ["unlike:comment"]);

        const newSession = await session.create(likingUser);
        const res = await fetch(
          `${orchestrator.webserverUrl}/api/v1/comment-like/${testComment.id}`,
          {
            method: "DELETE",
            headers: {
              cookie: `session_id=${newSession.token}`,
            },
          },
        );

        const resBody = await res.json();
        expect(res.status).toBe(403);
        expect(resBody.name).toBe("ForbiddenError");
      } finally {
        // Garante que a feature seja restaurada para não afetar outros testes
        await user.addFeatures(likingUser, ["unlike:comment"]);
      }
    });

    it("should return 200 and likes_count 0 for a non-existent comment ID", async () => {
      const newSession = await session.create(likingUser);
      const nonExistentCommentId = uuid();
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/comment-like/${nonExistentCommentId}`,
        {
          method: "DELETE",
          headers: {
            cookie: `session_id=${newSession.token}`,
          },
        },
      );

      const resBody = await res.json();
      expect(res.status).toBe(200);
      expect(resBody.likes_count).toBe(0);
    });

    it("should return 403 PasswordExpiredError if the user's password has expired", async () => {
      const expiredUser = await user.create({
        username: "expiredUserDelete",
        email: "expiredDelete@test.com",
        password: "StrongPassword123@",
      });

      // O usuário precisa ter um like para tentar remover
      await likeModel.like({ comment_id: testComment.id }, expiredUser);

      await user.expireUserPassword(expiredUser);
      const newSession = await session.create(expiredUser);

      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/comment-like/${testComment.id}`,
        {
          method: "DELETE",
          headers: {
            cookie: `session_id=${newSession.token}`,
          },
        },
      );

      const resBody = await res.json();
      expect(res.status).toBe(403);
      expect(resBody.name).toBe("PasswordExpiredError");

      // Limpeza: remove o like do usuário expirado para não interferir em outros testes de contagem.
      await likeModel.unlike({ comment_id: testComment.id }, expiredUser);
    });
  });

  describe("Anonymous User", () => {
    it("should return 403 Forbidden when trying to unlike a comment", async () => {
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/comment-like/${testComment.id}`,
        {
          method: "DELETE",
        },
      );

      const resBody = await res.json();
      expect(res.status).toBe(403);
      expect(resBody.name).toBe("ForbiddenError");
    });
  });
});
