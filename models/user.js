/**
 * This model handles user-related operations in the database.
 * It includes functions to create, update, fetch, and manage user permissions.
 */

import database from "infra/database.js";
import authentication from "models/authentication.js";
import validator from "models/validator.js";
import { NotFoundError, ValidationError } from "errors/index.js";
import ERROR_MESSAGES from "models/error-messages.js";

const DEFAULT_PASSWORD_EXPIRATION_IN_SECONDS = 60 * 60 * 24 * 90; // 90 day
const DEFAULT_FEATURES = [
  "create:session",
  "read:session:self",
  "read:user:self",
  "update:user:password:self",
  "nivel:taiko:iniciante",
  "create:comment",
  "read:comment",
  "update:self:comment",
  "delete:self:comment",
  "like:comment",
  "unlike:comment",
  "read:subscription:self",
  "read:payment:self",
  "update:payment:indicate_paid",
];

/**
 * Creates a new user in the database.
 * @param {Object} userData - Data of the user to be created.
 * @returns {Object} - Returns the created user.
 */
async function create(userData) {
  const validatedUserData = validator(userData, {
    username: "required",
    email: "required",
    password: "required",
  });
  await validateUniqueUser(validatedUserData);
  await hashPasswordInObject(validatedUserData);

  validatedUserData.features = DEFAULT_FEATURES;

  const query = {
    text: `
      INSERT INTO
        users
        (username, email, password, features, password_expires_at)
      VALUES
        ($1, $2, $3, $4, $5)
      RETURNING
        *
    ;`,
    values: [
      validatedUserData.username,
      validatedUserData.email,
      validatedUserData.password,
      validatedUserData.features,
      datePasswordExpiresAt("2019-09-21 00:00:00"),
    ],
  };
  const results = await database.query(query);
  return results.rows[0];
}

/**
 * Creates an anonymous user with limited permissions.
 * @returns {Object} - Returns the anonymous user.
 */
function createAnonymous() {
  return {
    features: [/*"create:user",*/ "create:session"],
  };
}

/**
 * Updates the data of an existing user.
 * @param {Object} userData - Data of the user to be updated.
 * @returns {Object} - Returns the updated user.
 */
async function update(userData) {
  const validatedUserData = validator(userData, {
    id: "required",
    username: "optional",
    email: "optional",
    password: "optional",
  });

  const { id, ...fieldsToUpdate } = validatedUserData;
  const validatedFieldsToUpdate = validator(fieldsToUpdate, {
    username: "optional",
    email: "optional",
    password: "optional",
  });

  if (validatedFieldsToUpdate.username || validatedFieldsToUpdate.email) {
    await validateUniqueUser(validatedFieldsToUpdate);
  }

  await hashPasswordInObject(validatedFieldsToUpdate);

  if (validatedFieldsToUpdate.password) {
    validatedFieldsToUpdate.password_expires_at = datePasswordExpiresAt();
  }

  if (validatedFieldsToUpdate) {
    const updateFields = [];
    const updateValues = [];
    let index = 1;

    for (const [key, value] of Object.entries(validatedFieldsToUpdate)) {
      updateFields.push(`${key} = $${index}`);
      updateValues.push(value);
      index++;
    }

    updateValues.push(id);

    const query = {
      text: `
      UPDATE
        users
      SET
        ${updateFields.join(", ")},
        updated_at = timezone('utc', now())
      WHERE
        id = $${index}
      RETURNING
        *
    ;`,
      values: updateValues,
    };

    const results = await database.query(query);
    return results.rows[0];
  }
  return {};
}

/**
 * Fetches a user based on the provided parameters.
 * @param {Object} searchParams - Search parameters.
 * @returns {Object} - Returns the found user.
 */
async function findOneUser(searchParams) {
  const validatedSearchParams = validator(searchParams, {
    id: "optional",
    email: "optional",
    username: "optional",
  });

  const { conditions, values } = buildDynamicConditions(validatedSearchParams, [
    "id",
    "email",
    "username",
  ]);

  const query = {
    text: `
      SELECT
        *
      FROM
        users
      WHERE
        ${conditions.join(" OR ")}
      LIMIT 1
    ;`,
    values,
  };

  const results = await database.query(query);
  return results.rows[0];
}

/**
 * Adds specific permissions to a user.
 * @param {Object} userObject - User object.
 * @param {Array} features - List of permissions to be added.
 * @returns {Object} - Returns the updated user.
 */
async function addFeatures(userObject, features) {
  const validUserData = validator(userObject, {
    id: "required",
  });

  const validFeatures = validator(
    { features: features },
    {
      features: "required",
    },
  );
  const query = {
    text: `
      UPDATE
        users
      SET
        features = (
          SELECT
            ARRAY(
              SELECT DISTINCT unnest(features || $1)
            )
        ),
        updated_at = timezone('utc', now())
      WHERE
        id = $2
      RETURNING
        *
    ;`,
    values: [validFeatures.features, validUserData.id],
  };

  const results = await database.query(query);
  return results.rows[0];
}

/**
 * Removes specific permissions from a user.
 * @param {Object} userObject - User object.
 * @param {Array} features - List of permissions to be removed.
 * @returns {Object} - Returns the updated user.
 */
async function removeFeatures(userObject, features) {
  const validUserData = validator(userObject, {
    id: "required",
  });

  const validFeatures = validator(
    { features: features },
    {
      features: "required",
    },
  );

  let lastUpdatedUser;

  if (validFeatures.features.length > 0) {
    for (const feature of validFeatures.features) {
      const query = {
        text: `
          UPDATE
            users
          SET
            features = array_remove(features, $1),
            updated_at = timezone('utc', now())
          WHERE
            id = $2
          RETURNING
            *
        ;`,
        values: [feature, validUserData.id],
      };

      const results = await database.query(query);
      lastUpdatedUser = results.rows[0];
    }
  } else {
    const query = {
      text: `
        UPDATE
          users
        SET
          features = '{}',
          updated_at = timezone('utc', now())
        WHERE
          id = $1
        RETURNING
          *
      ;`,
      values: [validUserData.id],
    };

    const results = await database.query(query);
    lastUpdatedUser = results.rows[0];
  }

  return lastUpdatedUser;
}

/**
 * Updates permissions from a user.
 * @param {Object} userObject - User object.
 * @param {Array} features - List of permissions to be setted.
 * @returns {Object} - Returns the updated user.
 */
async function updateFeatures(userObject, features) {
  const validUserData = validator(userObject, {
    id: "required",
  });

  const validFeatures = validator(
    { features: features },
    {
      features: "required",
    },
  );

  const query = {
    text: `
      UPDATE
        users
      SET
        features = $2,
        updated_at = timezone('utc', now())
      WHERE
        id = $1
      RETURNING
        *
    ;`,
    values: [validUserData.id, validFeatures.features],
  };
  const results = await database.query(query);
  if (results.rowCount === 0) {
    throw new NotFoundError(ERROR_MESSAGES.USER_NOT_FOUND);
  }
  return results.rows[0];
}

// Helper function to validate if the user's username or email is unique
async function validateUniqueUser(userData) {
  const { conditions, values } = buildDynamicConditions(userData, [
    "username",
    "email",
  ]);
  let whereClause = `(${conditions.join(" OR ")})`;

  if (userData.id) {
    values.push(userData.id);
    whereClause += ` AND id <> $${values.length}`;
  }

  const query = {
    text: `
      SELECT
        username,
        email
      FROM
        users
      WHERE
        ${whereClause}
    `,
    values,
  };

  const results = await database.query(query);

  if (!results.rowCount) return;

  const isDuplicateUsername = results.rows.some(
    ({ username }) =>
      username.toLowerCase() === userData.username?.toLowerCase(),
  );

  if (isDuplicateUsername) {
    throw new ValidationError(ERROR_MESSAGES.DUPLICATE_USERNAME);
  }

  throw new ValidationError(ERROR_MESSAGES.DUPLICATE_EMAIL);
}

// Helper function to hash the user's password
async function hashPasswordInObject(userObject) {
  if (userObject.password) {
    userObject.password = await authentication.hashPassword(
      userObject.password,
    );
  }
  return userObject;
}

// Helper function to return the date when the password expires
function datePasswordExpiresAt(password_expires_at) {
  return new Date(
    password_expires_at !== undefined
      ? Date.parse(password_expires_at)
      : Date.now() + 1000 * DEFAULT_PASSWORD_EXPIRATION_IN_SECONDS,
  );
}

// Helper function to build dynamic conditions for SQL queries
function buildDynamicConditions(params, fields) {
  const conditions = [];
  const values = [];
  let index = 1;

  for (const field of fields) {
    if (params[field]) {
      if (field === "id") {
        conditions.push(`${field} = $${index}::uuid`);
      } else if (field === "email" || field === "username") {
        conditions.push(`LOWER(${field}) = LOWER($${index})`);
      } else {
        conditions.push(`${field} = $${index}`);
      }
      values.push(params[field]);
      index++;
    }
  }

  return { conditions, values };
}

async function expireUserPassword(userObject) {
  const userFound = await findOneUser(userObject);

  if (!userFound) {
    throw new NotFoundError(ERROR_MESSAGES.USER_NOT_FOUND);
  }

  const query = {
    text: `
      UPDATE
        users
      SET
        password_expires_at = created_at - interval '1 day',
        updated_at = timezone('utc', now())
      WHERE
        id = $1
      RETURNING
        *
    ;`,
    values: [userFound.id],
  };

  const results = await database.query(query);
  return results.rows[0];
}

/**
 * Fetches all users that possess a specific feature.
 * @param {string} feature - The feature to search for.
 * @returns {Array} - Returns a list of users with the feature.
 */
async function findUsersByFeatures(features) {
  const validatedData = validator({ features }, { features: "required" });

  if (validatedData.features.length === 0) {
    return [];
  }

  const query = {
    text: `
    SELECT
      *
    FROM
      users
    WHERE
      features::text[] && $1::text[]
    ;`,
    values: [validatedData.features],
  };

  const results = await database.query(query);
  return results.rows;
}

const user = {
  create,
  createAnonymous,
  update,
  findOneUser,
  addFeatures,
  removeFeatures,
  expireUserPassword,
  updateFeatures,
  findUsersByFeatures,
  DEFAULT_FEATURES,
};

export default user;
