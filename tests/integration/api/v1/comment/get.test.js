import orchestrator from "tests/orchestrator.js";
import user from "models/user.js";
import session from "models/session.js";
import comment from "models/comment.js";

describe("GET /api/v1/comment", () => {
  let defaultUser;
  let otherUser;

  beforeAll(async () => {
    await orchestrator.waitForAllServices();
    await orchestrator.clearDatabase();
    await orchestrator.runPendingMigrations();

    defaultUser = await user.create({
      username: "getter",
      email: "getter@test.com",
      password: "StrongPassword123@",
    });

    defaultUser = await user.update({
      id: defaultUser.id,
      password: "StrongPassword123@",
    });

    otherUser = await user.create({
      username: "replier",
      email: "replier@test.com",
      password: "StrongPassword123@",
    });

    otherUser = await user.update({
      id: otherUser.id,
      password: "StrongPassword123@",
    });

    // Criando múltiplos comentários e uma resposta para os testes
    const firstComment = await comment.create(
      {
        content: "First comment for video1",
        video_id: "video1",
      },
      defaultUser,
    );

    await comment.create(
      {
        content: "Second comment for video1",
        video_id: "video1",
      },
      otherUser,
    );

    await comment.create(
      {
        content: "Reply to first comment",
        video_id: "video1",
        parent_id: firstComment.id,
      },
      otherUser,
    );
  });

  describe("Authenticated User", () => {
    it("should return a list of comments for a valid video_id", async () => {
      const newSession = await session.create(defaultUser);
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/comment?video_id=video1`,
        {
          // MUDANÇA: 'video_id' agora está no corpo da requisição
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${newSession.token}`,
          },
        },
      );

      const resBody = await res.json();
      expect(res.status).toBe(200);
      expect(resBody[0].content).toBe("First comment for video1");
      expect(resBody[0].username).toBe("getter");
      expect(resBody[0].likes_count).toBe("0");
    });

    it("should return a list of comments for a valid video_id", async () => {
      const newSession = await session.create(defaultUser);
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/comment?video_id=video1`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${newSession.token}`,
          },
        },
      );

      const resBody = await res.json();
      expect(res.status).toBe(200);
      expect(Array.isArray(resBody)).toBe(true);
    });

    it("should return multiple comments and their replies for a video_id", async () => {
      const newSession = await session.create(defaultUser);
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/comment?video_id=video1`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${newSession.token}`,
          },
        },
      );

      const resBody = await res.json();
      expect(res.status).toBe(200);
      expect(resBody.length).toBe(3); // 2 comentários principais + 1 resposta

      const parentComment = resBody.find(
        (c) => c.content === "First comment for video1",
      );
      const replyComment = resBody.find(
        (c) => c.content === "Reply to first comment",
      );

      expect(parentComment).toBeDefined();
      expect(replyComment).toBeDefined();
      expect(replyComment.parent_id).toBe(parentComment.id);
    });

    it("should return an empty array for a video_id with no comments", async () => {
      const newSession = await session.create(defaultUser);
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/comment?video_id=video-with-no-comments`,
        {
          // MUDANÇA: 'video_id' agora está no corpo da requisição
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${newSession.token}`,
          },
        },
      );

      const resBody = await res.json();
      expect(res.status).toBe(200);
      expect(resBody).toEqual([]);
    });

    it("should return 400 Bad Request if 'video_id' is missing", async () => {
      const newSession = await session.create(defaultUser);
      const res = await fetch(`${orchestrator.webserverUrl}/api/v1/comment`, {
        // MUDANÇA: Enviando um corpo vazio para simular a ausência do 'video_id'
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          cookie: `session_id=${newSession.token}`,
        },
      });

      const resBody = await res.json();
      expect(res.status).toBe(400);
      expect(resBody.name).toBe("ValidationError");
      expect(resBody.message).toBe('"video_id" é um campo obrigatório.');
    });
  });

  describe("Anonymous User", () => {
    it("should return 403 Forbidden when trying to access comments", async () => {
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/comment?video_id=video1`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      const resBody = await res.json();
      expect(res.status).toBe(403);
      expect(resBody.name).toBe("ForbiddenError");
    });
  });
});
