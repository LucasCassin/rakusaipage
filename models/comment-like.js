import database from "infra/database.js";
import validator from "models/validator.js";
import authorization from "models/authorization.js";
import { NotFoundError } from "errors/index.js";
import ERROR_MESSAGES from "models/error-messages.js";

/**
 * Adiciona uma curtida a um comentário e retorna a contagem atualizada.
 */
async function like(likeData, user) {
  const authorizedInput = authorization.filterInput(
    user,
    "like:comment",
    likeData,
  );

  const validatedData = validator(authorizedInput, { comment_id: "required" });

  try {
    const insertQuery = {
      text: `
        INSERT INTO comment_likes (user_id, comment_id)
        VALUES ($1, $2)
        ON CONFLICT (user_id, comment_id) DO NOTHING;
      `,
      values: [user.id, validatedData.comment_id],
    };

    await database.query(insertQuery);
    const countQuery = {
      text: `
        SELECT COUNT(*)::int AS "likesCount"
        FROM comment_likes
        WHERE comment_id = $1;
      `,
      values: [validatedData.comment_id],
    };

    const results = await database.query(countQuery);

    // Retorna o resultado final
    return {
      comment_id: validatedData.comment_id,
      likes_count: results.rows[0].likesCount,
    };
  } catch (error) {
    if (error.cause?.code === "23503") {
      throw new NotFoundError(ERROR_MESSAGES.COMMENT_NOT_FOUND);
    }
    throw error;
  }
}

/**
 * Remove uma curtida de um comentário e retorna a contagem atualizada.
 */
async function unlike(likeData, user) {
  const authorizedInput = authorization.filterInput(
    user,
    "unlike:comment",
    likeData,
  );
  const validatedData = validator(authorizedInput, { comment_id: "required" });

  try {
    const deleteQuery = {
      text: `
        DELETE FROM comment_likes
        WHERE user_id = $1 AND comment_id = $2;
      `,
      values: [user.id, validatedData.comment_id],
    };

    await database.query(deleteQuery);
    const countQuery = {
      text: `
        SELECT COUNT(*)::int AS "likesCount"
        FROM comment_likes
        WHERE comment_id = $1;
      `,
      values: [validatedData.comment_id],
    };

    const results = await database.query(countQuery);

    const likesCount = results.rows[0]?.likesCount ?? 0;

    return {
      comment_id: validatedData.comment_id,
      likes_count: likesCount,
    };
  } catch (error) {
    throw error;
  }
}

/**
 * Busca todos os user_ids que curtiram um determinado comentário.
 * (Esta função já estava otimizada)
 */
async function findLikesByCommentId(commentId) {
  const validatedData = validator(
    { comment_id: commentId },
    { comment_id: "required" },
  );
  const query = {
    text: `SELECT user_id FROM comment_likes WHERE comment_id = $1;`,
    values: [validatedData.comment_id],
  };
  const results = await database.query(query);
  return results.rows.map((row) => row.user_id);
}

export default {
  like,
  unlike,
  findLikesByCommentId,
};
