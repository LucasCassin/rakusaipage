import database from "infra/database.js";
import validator from "models/validator.js";

async function create(data) {
  const validatedData = validator(data, {
    name: "required",
    image_url: "required",
  });

  const query = {
    text: `INSERT INTO element_types (name, image_url) VALUES ($1, $2) RETURNING *;`,
    values: [validatedData.name, validatedData.image_url],
  };
  const results = await database.query(query);
  return results.rows[0];
}

async function findAll() {
  const results = await database.query(
    "SELECT * FROM element_types ORDER BY name;",
  );
  return results.rows;
}

export default {
  create,
  findAll,
};
