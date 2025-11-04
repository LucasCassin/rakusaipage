import database from "infra/database.js";
import validator from "models/validator.js";
import { NotFoundError, ForbiddenError } from "errors/index.js";

async function create(data, created_by_user_id) {
  // Valida o user_id separadamente, pois ele vem da sessão
  const validatedUserId = validator(
    { user_id: created_by_user_id },
    {
      user_id: "required",
    },
  );

  const validatedData = validator(data, {
    name: "required",
    date: "optional",
    location: "optional",
    meet_time: "optional",
    meet_location: "optional",
    description: "optional",
    is_public: "optional",
  });

  const query = {
    text: `
      INSERT INTO presentations 
        (name, date, location, meet_time, meet_location, description, is_public, created_by_user_id)
      VALUES 
        ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *;
    `,
    values: [
      validatedData.name,
      validatedData.date || null,
      validatedData.location || null,
      validatedData.meet_time || null,
      validatedData.meet_location || null,
      validatedData.description || null,
      validatedData.is_public || false,
      validatedUserId.user_id,
    ],
  };

  const results = await database.query(query);
  return results.rows[0];
}

async function update(presentation_id, data, user_id) {
  // Valida os dados do body
  const validatedData = validator(data, {
    name: "optional",
    date: "optional",
    location: "optional",
    meet_time: "optional",
    meet_location: "optional",
    description: "optional",
    is_public: "optional",
  });

  // Valida os IDs
  const validatedIds = validator(
    { presentation_id, user_id },
    {
      presentation_id: "required",
      user_id: "required",
    },
  );

  const originalPresentation = await findById(validatedIds.presentation_id);
  if (!originalPresentation) {
    throw new NotFoundError({ message: "Apresentação não encontrada." });
  }
  // Só o criador pode editar
  if (originalPresentation.created_by_user_id !== validatedIds.user_id) {
    throw new ForbiddenError({
      message: "Você não tem permissão para editar esta apresentação.",
    });
  }

  // Constrói o SET clause APENAS com os dados do body
  const updateFields = Object.keys(validatedData)
    .map((key, index) => `"${key}" = $${index + 1}`)
    .join(", ");

  // Se o body estava vazio, não faz nada
  if (Object.keys(validatedData).length === 0) return originalPresentation;

  const query = {
    text: `
      UPDATE presentations
      SET ${updateFields}, updated_at = now()
      WHERE id = $${Object.keys(validatedData).length + 1}
      RETURNING *;
    `,
    values: [...Object.values(validatedData), validatedIds.presentation_id],
  };

  const results = await database.query(query);
  return results.rows[0];
}

async function del(presentation_id, user_id) {
  const validatedData = validator(
    { presentation_id, user_id },
    { presentation_id: "required", user_id: "required" },
  );

  const presentation = await findById(validatedData.presentation_id);
  if (!presentation) {
    throw new NotFoundError({ message: "Apresentação não encontrada." });
  }
  if (presentation.created_by_user_id !== validatedData.user_id) {
    throw new ForbiddenError({
      message: "Você não tem permissão para deletar esta apresentação.",
    });
  }

  const query = {
    text: `DELETE FROM presentations WHERE id = $1 RETURNING id;`,
    values: [validatedData.presentation_id],
  };
  await database.query(query);
  return { id: validatedData.presentation_id };
}

async function findById(presentation_id) {
  const validatedData = validator(
    { presentation_id },
    { presentation_id: "required" },
  );
  const query = {
    text: `SELECT * FROM presentations WHERE id = $1;`,
    values: [validatedData.presentation_id],
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
