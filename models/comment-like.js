import database from "infra/database.js";
import validator from "models/validator.js";
import authorization from "models/authorization.js";
import comment from "models/comment.js"; // Importa o modelo de comentário

/**
 * Adiciona uma curtida a um comentário.
 */
async function like(likeData, user) {
  const authorizedInput = authorization.filterInput(
    user,
    "like:comment",
    likeData,
  );
  const validatedData = validator(authorizedInput, { comment_id: "required" });

  // MUDANÇA: Verifica se o comentário existe ANTES de tentar dar like
  await comment.findOne(validatedData.comment_id);

  const query = {
    text: `
      INSERT INTO comment_likes (user_id, comment_id)
      VALUES ($1, $2)
      ON CONFLICT (user_id, comment_id) DO NOTHING
      RETURNING comment_id;
    `,
    values: [user.id, validatedData.comment_id],
  };

  const results = await database.query(query);
  return results.rows[0] || { comment_id: validatedData.comment_id };
}

/**
 * Remove uma curtida de um comentário.
 */
async function unlike(likeData, user) {
  const authorizedInput = authorization.filterInput(
    user,
    "unlike:comment",
    likeData,
  );
  const validatedData = validator(authorizedInput, { comment_id: "required" });

  // MUDANÇA: Verifica se o comentário existe ANTES de tentar dar unlike
  await comment.findOne(validatedData.comment_id);

  const query = {
    text: `
      DELETE FROM comment_likes
      WHERE user_id = $1 AND comment_id = $2
      RETURNING comment_id;
    `,
    values: [user.id, validatedData.comment_id],
  };

  const results = await database.query(query);
  return results.rows[0] || { comment_id: validatedData.comment_id };
}

/**
 * Busca todos os user_ids que curtiram um determinado comentário.
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
