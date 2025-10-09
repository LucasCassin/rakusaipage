import database from "infra/database.js";
import validator from "models/validator.js";

async function create(planData) {
  // MUDANÇA: A validação agora usa as chaves que criamos no validator.js
  const validatedData = validator(planData, {
    name: "required",
    description: "optional",
    full_value: "required",
    period_unit: "required",
    period_value: "required",
  });

  const query = {
    text: `
      INSERT INTO payment_plans (name, description, full_value, period_unit, period_value)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `,
    values: [
      validatedData.name,
      validatedData.description,
      validatedData.full_value,
      validatedData.period_unit,
      validatedData.period_value,
    ],
  };

  const results = await database.query(query);
  return results.rows[0];
}

async function findAll() {
  const query = {
    text: `SELECT * FROM payment_plans ORDER BY created_at ASC;`,
  };
  const results = await database.query(query);
  return results.rows;
}

async function findById(planId) {
  const validatedId = validator({ id: planId }, { id: "required" });
  const query = {
    text: `SELECT * FROM payment_plans WHERE id = $1;`,
    values: [validatedId.id],
  };
  const results = await database.query(query);
  return results.rows[0];
}

async function update(planId, updateData) {
  const validatedId = validator({ id: planId }, { id: "required" });
  // MUDANÇA: A validação agora usa as chaves que criamos no validator.js
  const validatedData = validator(updateData, {
    name: "optional",
    description: "optional",
    full_value: "optional",
    period_unit: "optional",
    period_value: "optional",
  });

  const updateFields = Object.keys(validatedData)
    .map((key, index) => `"${key}" = $${index + 1}`)
    .join(", ");

  const updateValues = Object.values(validatedData);

  if (updateValues.length === 0) {
    return findById(planId);
  }

  const query = {
    text: `
      UPDATE payment_plans
      SET ${updateFields}, updated_at = now()
      WHERE id = $${updateValues.length + 1}
      RETURNING *;
    `,
    values: [...updateValues, validatedId.id],
  };

  const results = await database.query(query);
  return results.rows[0];
}

export default {
  create,
  findAll,
  findById,
  update,
};
