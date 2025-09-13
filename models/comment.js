import database from "infra/database.js";
import validator from "models/validator.js";
import { NotFoundError } from "errors/index.js";
import ERROR_MESSAGES from "models/error-messages.js";

/**
 * Cria um novo comentário na base de dados.
 * A autorização já deve ter sido verificada na camada da API.
 */
async function create(commentData, user) {
  const validatedComment = validator(
    { ...commentData, user_id: user.id },
    {
      content: "required",
      video_id: "required",
      parent_id: "optional",
      user_id: "required",
      return_list: "optional",
    },
  );

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
  if (validatedComment?.return_list) {
    const updatedCommentList = await findByVideoId(
      validatedComment.video_id,
      user,
    );
    return updatedCommentList;
  } else {
    const newComment = await findOne(newCommentId, user);
    return newComment;
  }
}

/**
 * Busca todos os comentários (e as suas respostas) para um determinado video_id.
 * @param {string} videoId - O ID do vídeo.
 * @param {object} [requestingUser] - O usuário que está fazendo a requisição (opcional).
 */
async function findByVideoId(videoId, requestingUser) {
  const validatedData = validator(
    { video_id: videoId, user_id: requestingUser.id },
    { video_id: "required", user_id: "required" },
  );

  const query = {
    text: `
      WITH RECURSIVE comment_thread AS (
        SELECT
          c.*,
          u.username,
          (SELECT COUNT(*) FROM comment_likes cl WHERE cl.comment_id = c.id) AS likes_count,
          (SELECT COUNT(*) FROM comments r WHERE r.parent_id = c.id AND r.deleted_at IS NULL) AS reply_count,
          EXISTS (SELECT 1 FROM comment_likes cl_check WHERE cl_check.comment_id = c.id AND cl_check.user_id = $1) as liked_by_user,
          1 AS depth,
          c.id AS root_id
        FROM comments c JOIN users u ON c.user_id = u.id
        WHERE c.video_id = $2 AND c.parent_id IS NULL AND c.deleted_at IS NULL
        
        UNION ALL
        
        SELECT
          c.*,
          u.username,
          (SELECT COUNT(*) FROM comment_likes cl WHERE cl.comment_id = c.id) as likes_count,
          0 AS reply_count,
          EXISTS (SELECT 1 FROM comment_likes cl_check WHERE cl_check.comment_id = c.id AND cl_check.user_id = $1) as liked_by_user,
          ct.depth + 1,
          ct.root_id
        FROM comments c JOIN users u ON c.user_id = u.id
        JOIN comment_thread ct ON c.parent_id = ct.id
        WHERE c.deleted_at IS NULL
      ),
      sorted_comments AS (
        SELECT
          *,
          FIRST_VALUE((reply_count * 2) + likes_count) OVER (PARTITION BY root_id ORDER BY created_at ASC) as root_engagement_score,
          FIRST_VALUE(created_at) OVER (PARTITION BY root_id ORDER BY created_at ASC) as root_created_at
        FROM comment_thread
      )
      SELECT
        id, content, user_id, video_id, parent_id, created_at, updated_at, username, likes_count, liked_by_user
      FROM sorted_comments
      ORDER BY
        root_engagement_score DESC,
        root_created_at DESC,
        created_at ASC;
    `,
    values: [validatedData.user_id, validatedData.video_id],
  };

  const results = await database.query(query);
  return results.rows;
}

/**
 * Atualiza o conteúdo de um comentário existente.
 * @param {object} commentData - Dados do comentário.
 * @param {object} requestingUser - O usuário que está fazendo a requisição.
 */
async function update(commentData, requestingUser) {
  const validatedData = validator(
    { ...commentData, user_id: requestingUser.id },
    {
      comment_id: "required",
      content: "required",
      user_id: "required",
      return_list: "optional",
    },
  );

  const query = {
    text: `
      UPDATE comments
      SET
        content = $1,
        updated_at = timezone('utc', now())
      WHERE
        id = $2 AND deleted_at IS NULL
      RETURNING *;
    `,
    values: [validatedData.content, validatedData.comment_id],
  };

  const results = await database.query(query);
  if (results.rowCount === 0) {
    throw new NotFoundError(ERROR_MESSAGES.COMMENT_NOT_FOUND);
  }

  if (validatedData.return_list) {
    const videoId = results.rows[0].video_id;
    const updatedCommentList = await findByVideoId(videoId, requestingUser);
    return updatedCommentList;
  } else {
    const updatedComment = await findOne(results.rows[0].id, requestingUser);
    return updatedComment;
  }
}

/**
 * Realiza um "soft delete" de um comentário.
 * A autorização (se o utilizador é o dono ou admin) deve ser feita na API.
 */
async function del(commentData, requestingUser) {
  const validatedData = validator(commentData, {
    comment_id: "required",
    return_list: "optional",
  });

  const query = {
    text: `
      UPDATE comments
      SET
        deleted_at = timezone('utc', now())
      WHERE
        id = $1 AND deleted_at IS NULL
      RETURNING *;
    `,
    values: [validatedData.comment_id],
  };

  const results = await database.query(query);
  if (results.rowCount === 0) {
    throw new NotFoundError(ERROR_MESSAGES.COMMENT_NOT_FOUND);
  }
  if (validatedData.return_list) {
    const videoId = results.rows[0].video_id;
    const updatedCommentList = await findByVideoId(videoId, requestingUser);
    return updatedCommentList;
  } else {
    return results.rows[0];
  }
}

/**
 * Função auxiliar para encontrar um único comentário por ID.
 * @param {string} commentId - O ID do comentário a ser buscado.
 * @param {object} [requestingUser] - O usuário que está fazendo a requisição (opcional).
 */
async function findOne(commentId, requestingUser) {
  const validatedId = validator(
    { comment_id: commentId, user_id: requestingUser.id },
    { comment_id: "required", user_id: "required" },
  );

  const query = {
    text: `
      SELECT
        c.*,
        u.username,
        (SELECT COUNT(DISTINCT user_id) FROM comment_likes cl WHERE cl.comment_id = c.id) as likes_count,
        EXISTS (
          SELECT 1 FROM comment_likes cl_check
          WHERE cl_check.comment_id = c.id AND cl_check.user_id = $1
        ) as liked_by_user
      FROM
        comments c
      JOIN
        users u ON c.user_id = u.id
      WHERE
        c.id = $2 AND c.deleted_at IS NULL;
    `,
    values: [validatedId.user_id, validatedId.comment_id],
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
