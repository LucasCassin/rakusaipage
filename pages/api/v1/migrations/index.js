import { createRouter } from "next-connect";
import controller from "models/controller.js";
import migrator from "models/migrator.js";
import authentication from "models/authentication.js";
import authorization from "models/authorization.js";
import validator from "models/validator.js";

const route = createRouter()
  .use(authentication.injectAnonymousOrUser)
  .use(authentication.checkIfUserPasswordExpired);
route.get(authorization.canRequest("read:migration"), getHandler);
route.post(authorization.canRequest("create:migration"), postHandler);
route.delete(deleteHandler);

export default route.handler(controller.errorsHandlers);

/**
 * Handles the retrieval of pending migrations.
 */
async function getHandler(req, res) {
  const peddingMigrations = await migrator.listPendingMigrations();
  return res.status(200).json(peddingMigrations);
}

/**
 * Handles the execution of pending migrations.
 */
async function postHandler(req, res) {
  const migratedMigrations = await migrator.runPendingMigrations();

  if (migratedMigrations.length > 0) {
    return res.status(201).json(migratedMigrations);
  } else {
    return res.status(200).json(migratedMigrations);
  }
}

async function deleteHandler(req, res) {
  const hash = "$2b$14$v508U3EqzNDrjD/AmRNzf.hGhbxgjM3bpEomB/b87gchzFfuVUyuy";
  const { password } = validator(req.body, {
    password: "required",
  });

  await authentication.comparePassword(password, hash);

  postHandler(req, res);
}
