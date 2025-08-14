/**
 * This model defines the features available to users.
 * Features are used to control permissions and authorizations in the system.
 */

const availableFeatures = new Set([
  // USER
  "create:user",
  "read:user:self",
  "read:user:other",
  "update:user:self",
  "update:user:other",
  "update:user:features:self",
  "update:user:features:other",

  // MIGRATION
  "read:migration",
  "create:migration",

  // SESSION
  "create:session",
  "read:session:self",
  "read:session:other",

  //BLOCKS
  "block:other:update:self",

  // TABLES
  "read:table",
  "update:table",
]);

export default availableFeatures;
