import orchestrator from "tests/orchestrator.js";
import user from "models/user.js";
import session from "models/session.js";
import comment from "models/comment.js";

describe("POST /api/v1/comment", () => {
  let defaultUser;

  beforeAll(async () => {
    await orchestrator.waitForAllServices();
    await orchestrator.clearDatabase();
    await orchestrator.runPendingMigrations();

    defaultUser = await user.create({
      username: "poster",
      email: "poster@test.com",
      password: "StrongPassword123@",
    });

    defaultUser = await user.update({
      id: defaultUser.id,
      password: "StrongPassword123@",
    });
  });

  describe("Authenticated User", () => {
    it("should create a new top-level comment and return it with enriched data", async () => {
      const newSession = await session.create(defaultUser);
      const res = await fetch(`${orchestrator.webserverUrl}/api/v1/comment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `session_id=${newSession.token}`,
        },
        body: JSON.stringify({
          content: "A new top-level comment.",
          video_id: "video-post-1",
        }),
      });

      const resBody = await res.json();
      expect(res.status).toBe(201);
      expect(resBody.content).toBe("A new top-level comment.");
      expect(resBody.username).toBe(defaultUser.username);
      expect(resBody.likes_count).toBe("0");
      expect(resBody.parent_id).toBeNull();
      expect(resBody.liked_by_user).toBe(false);
    });

    it("should create a reply to another comment", async () => {
      const parentComment = await comment.create(
        {
          content: "Parent comment",
          video_id: "video-post-2",
        },
        defaultUser,
      );
      const newSession = await session.create(defaultUser);

      const res = await fetch(`${orchestrator.webserverUrl}/api/v1/comment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `session_id=${newSession.token}`,
        },
        body: JSON.stringify({
          content: "This is a reply.",
          video_id: "video-post-2",
          parent_id: parentComment.id,
        }),
      });

      const resBody = await res.json();
      expect(res.status).toBe(201);
      expect(resBody.content).toBe("This is a reply.");
      expect(resBody.parent_id).toBe(parentComment.id);
    });

    it("should return 400 Bad Request if 'content' is missing", async () => {
      const newSession = await session.create(defaultUser);
      const res = await fetch(`${orchestrator.webserverUrl}/api/v1/comment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `session_id=${newSession.token}`,
        },
        body: JSON.stringify({ video_id: "any_video" }),
      });

      const resBody = await res.json();
      expect(res.status).toBe(400);
      expect(resBody.name).toBe("ValidationError");
      expect(resBody.message).toBe('"content" é um campo obrigatório.');
    });

    it("should return 403 PasswordExpiredError if the user's password has expired", async () => {
      const expiredUser = await user.expireUserPassword(defaultUser);
      const newSession = await session.create(expiredUser);

      const res = await fetch(`${orchestrator.webserverUrl}/api/v1/comment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `session_id=${newSession.token}`,
        },
        body: JSON.stringify({
          content: "Trying to post with expired password.",
          video_id: "video-post-expired",
        }),
      });

      const resBody = await res.json();
      expect(res.status).toBe(403);
      expect(resBody.name).toBe("PasswordExpiredError");
    });
  });

  describe("Anonymous User", () => {
    it("should return 403 Forbidden when trying to create a comment", async () => {
      const res = await fetch(`${orchestrator.webserverUrl}/api/v1/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: "Anonymous comment.",
          video_id: "video-post-anon",
        }),
      });

      const resBody = await res.json();
      expect(res.status).toBe(403);
      expect(resBody.name).toBe("ForbiddenError");
    });
  });
});
