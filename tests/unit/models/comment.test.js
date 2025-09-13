import comment from "models/comment.js";
import commentLike from "models/comment-like.js";
import user from "models/user.js";
import orchestrator from "tests/orchestrator.js";
import { NotFoundError, ValidationError } from "errors/index.js";
import ERROR_MESSAGES from "models/error-messages.js";

describe("Comment Model", () => {
  let commenterUser, requesterUser, otherLikerUser;

  beforeAll(async () => {
    await orchestrator.waitForAllServices();
    await orchestrator.clearDatabase();
    await orchestrator.runPendingMigrations();

    commenterUser = await user.create({
      username: "commenter",
      email: "commenter@test.com",
      password: "StrongPassword123@",
    });

    requesterUser = await user.create({
      username: "requester",
      email: "requester@test.com",
      password: "StrongPassword123@",
    });

    otherLikerUser = await user.create({
      username: "otherLiker",
      email: "otherliker@test.com",
      password: "StrongPassword123@",
    });
  });

  describe("create", () => {
    it("should create a new comment and return the enriched object", async () => {
      const commentData = {
        content: "Este é um comentário de teste.",
        video_id: "video123",
      };
      const newComment = await comment.create(commentData, requesterUser); // Passa o user para enriquecimento

      expect(newComment.content).toBe("Este é um comentário de teste.");
      expect(newComment.user_id).toBe(requesterUser.id);
      expect(newComment.video_id).toBe("video123");
      expect(newComment.parent_id).toBeNull();
      // Verifica se os dados foram enriquecidos
      expect(newComment.username).toBe(requesterUser.username);
      expect(newComment.likes_count).toBe("0"); // Deve ser uma string do COUNT
    });

    it("should return the full, ordered list of comments if 'return_list' is true", async () => {
      const videoId = "video-create-return-list";
      // Setup: um comentário existente com 2 likes para garantir que ele fique no topo
      const topComment = await comment.create(
        { content: "Top comment", video_id: videoId },
        commenterUser,
      );
      await commentLike.like({ comment_id: topComment.id }, requesterUser);
      await commentLike.like({ comment_id: topComment.id }, otherLikerUser);

      const commentData = {
        content: "Newly created comment",
        video_id: videoId,
        return_list: true, // A chave do teste
      };

      const result = await comment.create(commentData, requesterUser);

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);

      // Verifica a ordenação por engajamento
      expect(result[0].content).toBe("Top comment");
      expect(result[1].content).toBe("Newly created comment");

      // Verifica se o 'liked_by_user' está correto para o requesterUser na lista retornada
      expect(result[0].liked_by_user).toBe(true); // O 'topComment' foi curtido pelo requester
      expect(result[1].liked_by_user).toBe(false); // O novo comentário não foi curtido
    });

    it("should return 'liked_by_user' as false for a brand new comment", async () => {
      const commentData = { content: "Novo sem likes", video_id: "video123" };
      const newComment = await comment.create(commentData, commenterUser);

      // A verificação é feita da perspectiva do 'requesterUser'
      const foundComment = await comment.findOne(newComment.id, requesterUser);

      expect(foundComment.likes_count).toBe("0");
      expect(foundComment.liked_by_user).toBe(false);
    });

    it("should create a reply to another comment", async () => {
      const parentComment = await comment.create(
        {
          content: "Parent",
          video_id: "video123",
        },
        requesterUser,
      );
      const replyData = {
        content: "Esta é uma resposta.",
        video_id: "video123",
        parent_id: parentComment.id,
      };
      const replyComment = await comment.create(replyData, requesterUser);
      expect(replyComment.content).toBe("Esta é uma resposta.");
      expect(replyComment.parent_id).toBe(parentComment.id);
    });

    it("should throw ValidationError if 'content' is missing", async () => {
      const commentData = { video_id: "video123" };
      await expect(comment.create(commentData, requesterUser)).rejects.toThrow(
        ValidationError,
      );
    });
  });

  describe("findByVideoId", () => {
    beforeAll(async () => {
      await comment.create(
        { content: "Unliked", video_id: "video-likes-test" },
        commenterUser,
      );

      const commentLikedByOther = await comment.create(
        { content: "Liked by other", video_id: "video-likes-test" },
        commenterUser,
      );
      const commentLikedByRequester = await comment.create(
        { content: "Liked by me", video_id: "video-likes-test" },
        commenterUser,
      );

      // Aplica os likes
      await commentLike.like(
        { comment_id: commentLikedByOther.id },
        otherLikerUser,
      );
      await commentLike.like(
        { comment_id: commentLikedByRequester.id },
        requesterUser,
      );
    });

    it("should return comments with correct 'likes_count' and 'liked_by_user' status for the requesting user", async () => {
      // A busca é feita pela perspectiva do 'requesterUser'
      const comments = await comment.findByVideoId(
        "video-likes-test",
        requesterUser,
      );

      expect(comments).toHaveLength(3);

      const unliked = comments.find((c) => c.content === "Unliked");
      const likedByOther = comments.find((c) => c.content === "Liked by other");
      const likedByMe = comments.find((c) => c.content === "Liked by me");

      // Cenário 1: Sem likes
      expect(unliked.likes_count).toBe("0");
      expect(unliked.liked_by_user).toBe(false);

      // Cenário 2: Curtido por outro, não pelo requisitante
      expect(likedByOther.likes_count).toBe("1");
      expect(likedByOther.liked_by_user).toBe(false);

      // Cenário 3: Curtido pelo requisitante
      expect(likedByMe.likes_count).toBe("1");
      expect(likedByMe.liked_by_user).toBe(true);
    });

    it("should return an empty array for a video_id with no comments", async () => {
      const comments = await comment.findByVideoId(
        "video_with_no_comments",
        requesterUser,
      );
      expect(comments).toEqual([]);
    });
  });

  describe("update", () => {
    it("should update the content and return the enriched object", async () => {
      const myComment = await comment.create(
        {
          content: "Conteúdo original",
          video_id: "video789",
        },
        requesterUser,
      );
      await commentLike.like({ comment_id: myComment.id }, requesterUser); // Adiciona um like para teste

      const updatedData = {
        comment_id: myComment.id,
        content: "Conteúdo atualizado",
      };
      const updatedComment = await comment.update(updatedData, requesterUser);

      expect(updatedComment.content).toBe("Conteúdo atualizado");
      expect(updatedComment.username).toBe(requesterUser.username);
      expect(updatedComment.likes_count).toBe("1");
      expect(updatedComment.liked_by_user).toBe(true);
    });

    it("should return the full, ordered list of comments if 'return_list' is true on update", async () => {
      const videoId = "video-update-return-list";
      const commentToUpdate = await comment.create(
        { content: "To be updated", video_id: videoId },
        commenterUser,
      );
      const otherComment = await comment.create(
        { content: "Other comment", video_id: videoId },
        commenterUser,
      );
      await commentLike.like({ comment_id: otherComment.id }, requesterUser); // Dá um like no outro para testar a ordem

      const updateData = {
        comment_id: commentToUpdate.id,
        content: "Content has been updated",
        return_list: true, // A chave do teste
      };

      const result = await comment.update(updateData, requesterUser);

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);

      // Verifica a ordenação (o 'otherComment' tem 1 like, deve vir primeiro)
      expect(result[0].content).toBe("Other comment");
      expect(result[1].content).toBe("Content has been updated");

      // Verifica se o 'liked_by_user' está correto na lista
      expect(result[0].liked_by_user).toBe(true);
      expect(result[1].liked_by_user).toBe(false);
    });

    it("should return 'liked_by_user' as true when updating a comment liked by the requester", async () => {
      const myComment = await comment.create(
        { content: "Original", video_id: "video-update-test" },
        commenterUser,
      );
      await commentLike.like({ comment_id: myComment.id }, requesterUser);

      const updatedData = { comment_id: myComment.id, content: "Atualizado" };
      const updatedComment = await comment.update(updatedData, requesterUser); // Requester está editando

      expect(updatedComment.content).toBe("Atualizado");
      expect(updatedComment.likes_count).toBe("1");
      expect(updatedComment.liked_by_user).toBe(true);
    });

    it("should return 'liked_by_user' as false when updating a comment liked by another user", async () => {
      const myComment = await comment.create(
        { content: "Original 2", video_id: "video-update-test" },
        commenterUser,
      );
      await commentLike.like({ comment_id: myComment.id }, otherLikerUser);

      const updatedData = { comment_id: myComment.id, content: "Atualizado 2" };
      const updatedComment = await comment.update(updatedData, requesterUser); // Requester está editando

      expect(updatedComment.content).toBe("Atualizado 2");
      expect(updatedComment.likes_count).toBe("1");
      expect(updatedComment.liked_by_user).toBe(false);
    });

    it("should throw NotFoundError when trying to update a non-existent comment", async () => {
      const nonExistentId = orchestrator.generateRandomUUIDV4();
      const updateData = { comment_id: nonExistentId, content: "novo texto" };
      await expect(comment.update(updateData, requesterUser)).rejects.toThrow(
        expect.objectContaining(ERROR_MESSAGES.COMMENT_NOT_FOUND),
      );
    });
  });

  describe("del", () => {
    it("should soft delete a comment and return its ID", async () => {
      const myComment = await comment.create(
        {
          content: "Para ser apagado",
          video_id: "videoABC",
        },
        requesterUser,
      );
      const result = await comment.del(myComment.id);
      expect(result.id).toBe(myComment.id);
      await expect(
        comment.findOne(myComment.id, requesterUser),
      ).rejects.toThrow(NotFoundError);
    });

    it("should throw NotFoundError when trying to delete a non-existent comment", async () => {
      const nonExistentId = orchestrator.generateRandomUUIDV4();
      await expect(comment.del(nonExistentId)).rejects.toThrow(
        expect.objectContaining(ERROR_MESSAGES.COMMENT_NOT_FOUND),
      );
    });
  });

  describe("findOne", () => {
    it("should find and return a single enriched comment by its ID", async () => {
      const newComment = await comment.create(
        {
          content: "Comentário para encontrar",
          video_id: "find-me",
        },
        requesterUser,
      );
      const foundComment = await comment.findOne(newComment.id, requesterUser);
      expect(foundComment.id).toBe(newComment.id);
      expect(foundComment.username).toBe(requesterUser.username);
      expect(foundComment.likes_count).toBe("0");
    });

    it("should return 'liked_by_user' as true if the comment is liked by the requesting user", async () => {
      const newComment = await comment.create(
        { content: "A ser achado e curtido", video_id: "find-me-2" },
        commenterUser,
      );
      await commentLike.like({ comment_id: newComment.id }, requesterUser);

      const foundComment = await comment.findOne(newComment.id, requesterUser);

      expect(foundComment.id).toBe(newComment.id);
      expect(foundComment.likes_count).toBe("1");
      expect(foundComment.liked_by_user).toBe(true);
    });

    it("should return 'liked_by_user' as false if the comment is liked by another user", async () => {
      const newComment = await comment.create(
        { content: "A ser achado e curtido por outro", video_id: "find-me-3" },
        commenterUser,
      );
      await commentLike.like({ comment_id: newComment.id }, otherLikerUser);

      const foundComment = await comment.findOne(newComment.id, requesterUser);

      expect(foundComment.id).toBe(newComment.id);
      expect(foundComment.likes_count).toBe("1");
      expect(foundComment.liked_by_user).toBe(false);
    });

    it("should throw NotFoundError for a non-existent ID", async () => {
      const nonExistentId = orchestrator.generateRandomUUIDV4();
      await expect(
        comment.findOne(nonExistentId, requesterUser),
      ).rejects.toThrow(NotFoundError);
    });
  });
});
