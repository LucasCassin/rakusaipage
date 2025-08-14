/**
 * This model handles password hashing and comparison using bcrypt.
 */

import bcrypt from "bcrypt";

const saltRounds = 14;

/**
 * Generates the hash of a password.
 * @param {string} password - The password to be hashed.
 * @returns {Promise<string>} - Returns the hashed password.
 * @throws {TypeError} - Throws an error if the password is not a string.
 */
async function hashPassword(password) {
  if (typeof password !== "string") {
    throw new TypeError("A senha deve ser uma string.");
  }
  return await bcrypt.hash(password, saltRounds);
}

/**
 * Compares a provided password with a hash.
 * @param {string} password - The provided password.
 * @param {string} hash - The stored hash.
 * @returns {Promise<boolean>} - Returns `true` if the password matches the hash, otherwise `false`.
 * @throws {TypeError} - Throws an error if the password is not a string.
 */
async function comparePassword(password, hash) {
  if (typeof password !== "string") {
    throw new TypeError("A senha deve ser uma string.");
  }
  return await bcrypt.compare(password, hash);
}

const password = {
  hashPassword,
  comparePassword,
};

export default password;
