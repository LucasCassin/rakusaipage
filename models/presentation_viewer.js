import database from "infra/database.js";
import validator from "models/validator.js";
import { NotFoundError } from "errors/index.js";

async function addViewer(presentation_id, user_id) {
  const validatedData = validator(
    { presentation_id, user_id },
    {
      presentation_id: "required",
      user_id: "required",
    },
  );

  const query = {
    text: `
      INSERT INTO presentation_viewers (presentation_id, user_id)
      VALUES ($1, $2)
      ON CONFLICT (presentation_id, user_id) DO NOTHING
      RETURNING *;
    `,
    values: [validatedData.presentation_id, validatedData.user_id],
  };

  const results = await database.query(query);
  return results.rows[0];
}

async function removeViewer(presentation_id, user_id) {
  const validatedData = validator(
    { presentation_id, user_id },
    {
      presentation_id: "required",
      user_id: "required",
    },
  );

  const query = {
    text: `
      DELETE FROM presentation_viewers 
      WHERE presentation_id = $1 AND user_id = $2
      RETURNING id;
    `,
    values: [validatedData.presentation_id, validatedData.user_id],
  };

  const results = await database.query(query);
  if (results.rowCount === 0) {
    throw new NotFoundError({
      message: "Usuário não encontrado no elenco desta apresentação.",
    });
  }
  return results.rows[0];
}

async function findByPresentationId(presentation_id) {
  const validatedId = validator({ id: presentation_id }, { id: "required" });
  const query = {
    text: `
      SELECT u.id, u.username 
      FROM presentation_viewers pv
      JOIN users u ON pv.user_id = u.id
      WHERE pv.presentation_id = $1
      ORDER BY u.username;
    `,
    values: [validatedId.id],
  };
  const results = await database.query(query);
  return results.rows;
}

export default {
  addViewer,
  removeViewer,
  findByPresentationId,
};
