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
  "update:user:password:self",
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

  // COMMENTS
  "create:comment",
  "read:comment",
  "update:self:comment",
  "delete:self:comment",
  "update:other:comment",
  "delete:other:comment",
  "like:comment",
  "unlike:comment",

  //Taiko

  "nivel:taiko:iniciante",
  "nivel:taiko:intermediario",
  "nivel:taiko:avancado",
  "nivel:taiko:nao:mostrar",
  // "nivel:taiko:default",
  // "nivel:taiko:blocked",

  //Fue
  "nivel:fue:iniciante",
  "nivel:fue:intermediario",
  "nivel:fue:avancado",
  "nivel:fue:nao:mostrar",
  // "nivel:fue:default"
  // "nivel:fue:default",
  // "nivel:fue:blocked",

  //Admin
  "nivel:taiko:admin",
  "nivel:fue:admin",

  //Planos
  "create:payment_plan",
  "read:payment_plan",
  "update:payment_plan",
  "delete:payment_plan",

  //Assinaturas
  "create:subscription",
  "read:subscription:self",
  "read:subscription:other",
  "update:subscription",
  "delete:subscription",

  //Pagamentos
  "read:payment:self",
  "read:payment:other",
  "update:payment:indicate_paid",
  "update:payment:confirm_paid",

  //Feature para teste
  "test:feature",
  "test:feature:2",
  "test:feature:3",
]);

export default availableFeatures;
