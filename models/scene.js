import database from "infra/database.js";
import validator from "models/validator.js";
import { NotFoundError } from "errors/index.js";

async function create(data) {
  const validatedData = validator(data, {
    presentation_id: "required",
    name: "required",
    scene_type: "required", // <-- Renomeado
    order: "required",
    description: "optional",
  });

  const query = {
    text: `
      INSERT INTO scenes (presentation_id, name, scene_type, "order", description)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `,
    values: [
      validatedData.presentation_id,
      validatedData.name,
      validatedData.scene_type, // <-- Renomeado
      validatedData.order,
      validatedData.description || null,
    ],
  };

  const results = await database.query(query);
  return results.rows[0];
}

async function update(sceneId, data) {
  const validatedData = validator(data, {
    name: "optional",
    order: "optional",
    description: "optional",
  });

  const updateFields = Object.keys(validatedData)
    .map((key, index) => `"${key}" = $${index + 1}`)
    .join(", ");

  if (Object.keys(validatedData).length === 0) return findById(sceneId);

  const query = {
    text: `
      UPDATE scenes SET ${updateFields}
      WHERE id = $${Object.keys(validatedData).length + 1}
      RETURNING *;
    `,
    values: [...Object.values(validatedData), sceneId],
  };

  const results = await database.query(query);
  if (results.rowCount === 0) {
    throw new NotFoundError({ message: "Cena não encontrada." });
  }
  return results.rows[0];
}

async function del(sceneId) {
  const validatedId = validator({ id: sceneId }, { id: "required" });
  const query = {
    text: `DELETE FROM scenes WHERE id = $1 RETURNING id;`,
    values: [validatedId.id],
  };
  const results = await database.query(query);
  if (results.rowCount === 0) {
    throw new NotFoundError({ message: "Cena não encontrada." });
  }
  return results.rows[0];
}

async function findById(sceneId) {
  const validatedId = validator({ id: sceneId }, { id: "required" });
  const query = {
    text: `SELECT * FROM scenes WHERE id = $1;`,
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
