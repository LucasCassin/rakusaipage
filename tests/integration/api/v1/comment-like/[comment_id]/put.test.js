import orchestrator from "tests/orchestrator.js";
import user from "models/user.js";
import session from "models/session.js";
import comment from "models/comment.js";
import { v4 as uuid } from "uuid";

// ROTA ATUALIZADA
describe("PUT /api/v1/comment-like/:commentId", () => {
  let commentOwner, likingUser, testComment, otherTestComment;

  beforeAll(async () => {
    await orchestrator.waitForAllServices();
    await orchestrator.clearDatabase();
    await orchestrator.runPendingMigrations();

    commentOwner = await user.create({
      username: "commentOwner",
      email: "owner@test.com",
      password: "StrongPassword123@",
    });

    commentOwner = await user.update({
      id: commentOwner.id,
      password: "StrongPassword123@",
    });

    likingUser = await user.create({
      username: "likingUser",
      email: "liker@test.com",
      password: "StrongPassword123@",
    });

    likingUser = await user.update({
      id: likingUser.id,
      password: "StrongPassword123@",
    });

    testComment = await comment.create(
      {
        content: "Comment to be liked",
        video_id: "video-likes-1",
      },
      commentOwner,
    );

    otherTestComment = await comment.create(
      {
        content: "Comment to be liked 2",
        video_id: "video-likes-2",
      },
      commentOwner,
    );
  });

  describe("Authenticated User", () => {
    it("should allow a user to like a comment and return the updated like count", async () => {
      const newSession = await session.create(likingUser);
      // ROTA ATUALIZADA
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/comment-like/${testComment.id}`,
        {
          method: "PUT",
          headers: {
            cookie: `session_id=${newSession.token}`,
          },
        },
      );

      const resBody = await res.json();
      expect(res.status).toBe(200);
      expect(resBody).toEqual({
        comment_id: testComment.id,
        likes_count: 1,
      });
    });

    it("should be idempotent, returning the same like count if the user likes the same comment again", async () => {
      const newSession = await session.create(likingUser);
      // ROTA ATUALIZADA
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/comment-like/${testComment.id}`,
        {
          method: "PUT",
          headers: {
            cookie: `session_id=${newSession.token}`,
          },
        },
      );

      const resBody = await res.json();
      expect(res.status).toBe(200);
      expect(resBody.likes_count).toBe(1);
    });

    it("should add 2 counts", async () => {
      const newSession = await session.create(likingUser);
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/comment-like/${otherTestComment.id}`,
        {
          method: "PUT",
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

      const newSession2 = await session.create(commentOwner);
      const res2 = await fetch(
        `${orchestrator.webserverUrl}/api/v1/comment-like/${otherTestComment.id}`,
        {
          method: "PUT",
          headers: {
            cookie: `session_id=${newSession2.token}`,
          },
        },
      );

      const resBody2 = await res2.json();
      expect(res2.status).toBe(200);
      expect(resBody2).toEqual({
        comment_id: otherTestComment.id,
        likes_count: 2,
      });
    });

    it("should return 403 Forbidden if the user does not have the 'like:comment' feature", async () => {
      try {
        await user.removeFeatures(likingUser, ["like:comment"]);

        const newSession = await session.create(likingUser);
        const res = await fetch(
          `${orchestrator.webserverUrl}/api/v1/comment-like/${testComment.id}`,
          {
            method: "PUT",
            headers: {
              cookie: `session_id=${newSession.token}`,
            },
          },
        );

        const resBody = await res.json();
        expect(res.status).toBe(403);
        expect(resBody.name).toBe("ForbiddenError");
      } finally {
        await user.addFeatures(likingUser, ["like:comment"]);
      }
    });

    it("should return 404 Not Found when trying to like a non-existent comment", async () => {
      const newSession = await session.create(likingUser);
      const nonExistentCommentId = uuid();
      // ROTA ATUALIZADA
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/comment-like/${nonExistentCommentId}`,
        {
          method: "PUT",
          headers: {
            cookie: `session_id=${newSession.token}`,
          },
        },
      );

      const resBody = await res.json();
      expect(res.status).toBe(404);
      expect(resBody.name).toBe("NotFoundError");
    });

    it("should return 400 Bad Request for an invalid comment ID format", async () => {
      const newSession = await session.create(likingUser);
      // ROTA ATUALIZADA
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/comment-like/invalid-uuid-format`,
        {
          method: "PUT",
          headers: {
            cookie: `session_id=${newSession.token}`,
          },
        },
      );

      const resBody = await res.json();
      expect(res.status).toBe(400);
      expect(resBody.name).toBe("ValidationError");
    });

    it("should return 403 PasswordExpiredError if the user's password has expired", async () => {
      const expiredUser = await user.create({
        username: "expiredUserPut",
        email: "expiredPut@test.com",
        password: "StrongPassword123@",
      });

      await user.expireUserPassword(expiredUser);
      const newSession = await session.create(expiredUser);

      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/comment-like/${testComment.id}`,
        {
          method: "PUT",
          headers: {
            cookie: `session_id=${newSession.token}`,
          },
        },
      );

      const resBody = await res.json();
      expect(res.status).toBe(403);
      expect(resBody.name).toBe("PasswordExpiredError");
    });
  });

  describe("Anonymous User", () => {
    it("should return 403 Forbidden when trying to like a comment", async () => {
      // ROTA ATUALIZADA
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/comment-like/${testComment.id}`,
        {
          method: "PUT",
        },
      );

      const resBody = await res.json();
      expect(res.status).toBe(403);
      expect(resBody.name).toBe("ForbiddenError");
    });
  });
});
