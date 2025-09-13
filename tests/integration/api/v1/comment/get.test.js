import orchestrator from "tests/orchestrator.js";
import user from "models/user.js";
import session from "models/session.js";
import comment from "models/comment.js";
import commentLike from "models/comment-like.js";

describe("GET /api/v1/comment", () => {
  let requesterUser, otherUser, commentOwner;
  let commentUnliked, commentLikedByOther, commentLikedByRequester;

  beforeAll(async () => {
    await orchestrator.waitForAllServices();
    await orchestrator.clearDatabase();
    await orchestrator.runPendingMigrations();

    commentOwner = await user.create({
      username: "owner",
      email: "owner@test.com",
      password: "StrongPassword123@",
    });

    commentOwner = await user.update({
      id: commentOwner.id,
      password: "StrongPassword123@",
    });

    requesterUser = await user.create({
      username: "requester",
      email: "requester@test.com",
      password: "StrongPassword123@",
    });

    requesterUser = await user.update({
      id: requesterUser.id,
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

    const videoId = "video-likes-test";
    commentUnliked = await comment.create(
      { content: "Unliked", video_id: videoId },
      commentOwner,
    );
    commentLikedByOther = await comment.create(
      { content: "Liked by other", video_id: videoId },
      commentOwner,
    );
    commentLikedByRequester = await comment.create(
      { content: "Liked by me", video_id: videoId },
      commentOwner,
    );

    // Setup de likes
    await commentLike.like({ comment_id: commentLikedByOther.id }, otherUser);
    await commentLike.like(
      { comment_id: commentLikedByRequester.id },
      requesterUser,
    );

    // Criando múltiplos comentários e uma resposta para os testes
    const firstComment = await comment.create(
      {
        content: "First comment for video1",
        video_id: "video1",
      },
      commentOwner,
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
    it("should return comments with correct 'likes_count' and 'liked_by_user' status", async () => {
      const newSession = await session.create(requesterUser);
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/comment?video_id=video-likes-test`,
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
      expect(resBody).toHaveLength(3);

      const resultUnliked = resBody.find((c) => c.id === commentUnliked.id);
      const resultLikedByOther = resBody.find(
        (c) => c.id === commentLikedByOther.id,
      );
      const resultLikedByRequester = resBody.find(
        (c) => c.id === commentLikedByRequester.id,
      );

      // Cenário 1: Comentário sem likes
      expect(resultUnliked.likes_count).toBe("0");
      expect(resultUnliked.liked_by_user).toBe(false);

      // Cenário 2: Curtido por OUTRO usuário, não pelo requisitante
      expect(resultLikedByOther.likes_count).toBe("1");
      expect(resultLikedByOther.liked_by_user).toBe(false);

      // Cenário 3: Curtido PELO requisitante
      expect(resultLikedByRequester.likes_count).toBe("1");
      expect(resultLikedByRequester.liked_by_user).toBe(true);
    });

    it("should return a list of comments for a valid video_id", async () => {
      const newSession = await session.create(commentOwner);
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
      expect(resBody[0].username).toBe("owner");
      expect(resBody[0].likes_count).toBe("0");
    });

    it("should return a list of comments for a valid video_id", async () => {
      const newSession = await session.create(commentOwner);
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
      const newSession = await session.create(commentOwner);
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
      const newSession = await session.create(commentOwner);
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
      const newSession = await session.create(commentOwner);
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
