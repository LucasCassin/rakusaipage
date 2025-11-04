import database from "infra/database.js";
import validator from "models/validator.js";
import { NotFoundError } from "errors/index.js";

async function create(data) {
  const validatedData = validator(data, {
    scene_id: "required",
    element_type_id: "required",
    position_x: "required",
    position_y: "required",
    display_name: "optional",
    assigned_user_id: "optional",
  });

  const query = {
    text: `
      INSERT INTO scene_elements 
        (scene_id, element_type_id, position_x, position_y, display_name, assigned_user_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `,
    values: [
      validatedData.scene_id,
      validatedData.element_type_id,
      validatedData.position_x,
      validatedData.position_y,
      validatedData.display_name || null,
      validatedData.assigned_user_id || null,
    ],
  };
  const results = await database.query(query);
  return results.rows[0];
}

async function update(elementId, data) {
  const validatedData = validator(data, {
    position_x: "optional",
    position_y: "optional",
    display_name: "optional",
    assigned_user_id: "optional",
  });

  const updateFields = Object.keys(validatedData)
    .map((key, index) => `"${key}" = $${index + 1}`)
    .join(", ");

  if (Object.keys(validatedData).length === 0) {
    return findById(elementId); // Retorna o original se nada for mudado
  }

  const query = {
    text: `
      UPDATE scene_elements SET ${updateFields}
      WHERE id = $${Object.keys(validatedData).length + 1}
      RETURNING *;
    `,
    values: [...Object.values(validatedData), elementId],
  };

  const results = await database.query(query);
  if (results.rowCount === 0) {
    throw new NotFoundError({ message: "Elemento de cena não encontrado." });
  }
  return results.rows[0];
}

async function del(elementId) {
  const validatedId = validator({ id: elementId }, { id: "required" });
  const query = {
    text: `DELETE FROM scene_elements WHERE id = $1 RETURNING id;`,
    values: [validatedId.id],
  };
  const results = await database.query(query);
  if (results.rowCount === 0) {
    throw new NotFoundError({ message: "Elemento de cena não encontrado." });
  }
  return results.rows[0];
}

async function findById(elementId) {
  const validatedId = validator({ id: elementId }, { id: "required" });
  const query = {
    text: `SELECT * FROM scene_elements WHERE id = $1;`,
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
