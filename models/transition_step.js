import database from "infra/database.js";
import validator from "models/validator.js";
import { NotFoundError } from "errors/index.js";

async function create(data) {
  const validatedData = validator(data, {
    scene_id: "required",
    order: "required",
    description: "required",
    assigned_user_id: "optional",
  });

  const query = {
    text: `
      INSERT INTO transition_steps (scene_id, "order", description, assigned_user_id)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `,
    values: [
      validatedData.scene_id,
      validatedData.order,
      validatedData.description,
      validatedData.assigned_user_id || null,
    ],
  };
  const results = await database.query(query);
  return results.rows[0];
}

async function update(stepId, data) {
  const validatedData = validator(data, {
    order: "optional",
    description: "optional",
    assigned_user_id: "optional",
  });

  const updateFields = Object.keys(validatedData)
    .map((key, index) => `"${key}" = $${index + 1}`)
    .join(", ");

  if (Object.keys(validatedData).length === 0) return findById(stepId);

  const query = {
    text: `
      UPDATE transition_steps SET ${updateFields}
      WHERE id = $${Object.keys(validatedData).length + 1}
      RETURNING *;
    `,
    values: [...Object.values(validatedData), stepId],
  };

  const results = await database.query(query);
  if (results.rowCount === 0) {
    throw new NotFoundError({ message: "Passo de transição não encontrado." });
  }
  return results.rows[0];
}

async function del(stepId) {
  const validatedId = validator({ id: stepId }, { id: "required" });
  const query = {
    text: `DELETE FROM transition_steps WHERE id = $1 RETURNING id;`,
    values: [validatedId.id],
  };
  const results = await database.query(query);
  if (results.rowCount === 0) {
    throw new NotFoundError({ message: "Passo de transição não encontrado." });
  }
  return results.rows[0];
}

async function findById(stepId) {
  const validatedId = validator({ id: stepId }, { id: "required" });
  const query = {
    text: `SELECT * FROM transition_steps WHERE id = $1;`,
    values: [validatedId.id],
  };
  const results = await database.query(query);
  return results.rows[0];
}

export default {
  create,
  update,
  del,
  findById,
};
