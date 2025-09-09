import database from "infra/database.js";
import validator from "models/validator.js";
import { NotFoundError } from "errors/index.js";
import ERROR_MESSAGES from "models/error-messages.js";

/**
 * Cria um novo comentário na base de dados.
 * A autorização já deve ter sido verificada na camada da API.
 */
async function create(commentData, user) {
  const validatedComment = validator(commentData, {
    content: "required",
    video_id: "required",
    parent_id: "optional",
  });

  const query = {
    text: `
      INSERT INTO comments
        (content, user_id, video_id, parent_id)
      VALUES
        ($1, $2, $3, $4)
      RETURNING
        id;
    `,
    values: [
      validatedComment.content,
      user.id,
      validatedComment.video_id,
      validatedComment.parent_id,
    ],
  };

  const results = await database.query(query);
  const newCommentId = results.rows[0].id;

  // Busca o comentário recém-criado para enriquecê-lo com dados adicionais
  const newComment = await findOne(newCommentId);
  return newComment;
}

/**
 * Busca todos os comentários (e as suas respostas) para um determinado video_id.
 */
async function findByVideoId(videoId) {
  const validatedData = validator(
    { video_id: videoId },
    { video_id: "required" },
  );

  const query = {
    text: `
      WITH RECURSIVE comment_thread AS (
        SELECT
          c.*,
          u.username,
          (SELECT COUNT(*) FROM comment_likes cl WHERE cl.comment_id = c.id) as likes_count,
          1 AS depth
        FROM
          comments c
        JOIN
          users u ON c.user_id = u.id
        WHERE
          c.video_id = $1 AND c.parent_id IS NULL AND c.deleted_at IS NULL
        
        UNION ALL
        
        SELECT
          c.*,
          u.username,
          (SELECT COUNT(*) FROM comment_likes cl WHERE cl.comment_id = c.id) as likes_count,
          ct.depth + 1
        FROM
          comments c
        JOIN
          users u ON c.user_id = u.id
        JOIN
          comment_thread ct ON c.parent_id = ct.id
        WHERE
          c.deleted_at IS NULL
      )
      SELECT * FROM comment_thread ORDER BY created_at ASC;
    `,
    values: [validatedData.video_id],
  };

  const results = await database.query(query);
  return results.rows;
}

/**
 * Atualiza o conteúdo de um comentário existente.
 * A autorização (se o utilizador é o dono ou admin) deve ser feita na API.
 */
async function update(commentData) {
  const validatedData = validator(commentData, {
    comment_id: "required",
    content: "required",
  });

  const query = {
    text: `
      UPDATE comments
      SET
        content = $1,
        updated_at = timezone('utc', now())
      WHERE
        id = $2 AND deleted_at IS NULL
      RETURNING id;
    `,
    values: [validatedData.content, validatedData.comment_id],
  };

  const results = await database.query(query);
  if (results.rowCount === 0) {
    throw new NotFoundError(ERROR_MESSAGES.COMMENT_NOT_FOUND);
  }

  // Busca o comentário atualizado para retornar o objeto completo
  const updatedComment = await findOne(results.rows[0].id);
  return updatedComment;
}

/**
 * Realiza um "soft delete" de um comentário.
 * A autorização (se o utilizador é o dono ou admin) deve ser feita na API.
 */
async function del(commentId) {
  const validatedId = validator(
    { comment_id: commentId },
    { comment_id: "required" },
  );

  const query = {
    text: `
      UPDATE comments
      SET
        deleted_at = timezone('utc', now())
      WHERE
        id = $1 AND deleted_at IS NULL
      RETURNING
        id;
    `,
    values: [validatedId.comment_id],
  };

  const results = await database.query(query);
  if (results.rowCount === 0) {
    throw new NotFoundError(ERROR_MESSAGES.COMMENT_NOT_FOUND);
  }
  return results.rows[0];
}

/**
 * Função auxiliar para encontrar um único comentário por ID.
 * Usada internamente e pela camada da API para verificações.
 */
async function findOne(commentId) {
  const validatedId = validator(
    { comment_id: commentId },
    { comment_id: "required" },
  );

  const query = {
    text: `
      SELECT
        c.*,
        u.username,
        (SELECT COUNT(DISTINCT user_id) FROM comment_likes cl WHERE cl.comment_id = c.id) as likes_count
      FROM
        comments c
      JOIN
        users u ON c.user_id = u.id
      WHERE
        c.id = $1 AND c.deleted_at IS NULL;
    `,
    values: [validatedId.comment_id],
  };

  const results = await database.query(query);
  if (results.rowCount === 0) {
    throw new NotFoundError(ERROR_MESSAGES.COMMENT_NOT_FOUND);
  }
  return results.rows[0];
}

export default {
  create,
  findByVideoId,
  update,
  del,
  findOne, // Exporta a função findOne para ser usada na API
};
