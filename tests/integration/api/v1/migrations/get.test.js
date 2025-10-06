import orchestrator from "tests/orchestrator.js";
import user from "models/user.js";
import session from "models/session.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("GET /api/v1/migrations Endpoint", () => {
  describe("Anonymous User", () => {
    test("should return ForbiddenError for unauthorized access", async () => {
      const res = await fetch(`${orchestrator.webserverUrl}/api/v1/migrations`);
      const resBody = await res.json();
      expect(res.status).toBe(403);
      expect(resBody).toEqual({
        name: "ForbiddenError",
        message: "Usuário não pode executar esta operação.",
        action: 'Verifique se este usuário possui a feature "read:migration".',
        status_code: 403,
      });
    });
  });

  describe("Authenticated User", () => {
    test("should retrieve pending migrations successfully", async () => {
      let newUser = await user.create({
        username: "testuser",
        email: "testuser@example.com",
        password: "Senha@123",
      });
      newUser = await user.update({
        id: newUser.id,
        password: "Senha@123",
      });
      const newSession = await session.create(newUser);
      await user.addFeatures(newUser, ["read:migration"]);
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/migrations`,
        {
          method: "GET",
          headers: {
            Cookie: `session_id=${newSession.token}`,
          },
        },
      );
      const resBody = await res.json();
      expect(res.status).toBe(200);
      expect(Array.isArray(resBody)).toBe(true);
      expect(resBody.length).toBe(0);
    });

    test("should return ForbiddenError if the user lacks the 'read:migration' feature", async () => {
      let newUser = await user.create({
        username: "testuser2",
        email: "testuser2@example.com",
        password: "Senha@123",
      });
      newUser = await user.update({
        id: newUser.id,
        password: "Senha@123",
      });
      const newSession = await session.create(newUser);
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/migrations`,
        {
          method: "GET",
          headers: {
            Cookie: `session_id=${newSession.token}`,
          },
        },
      );
      const resBody = await res.json();
      expect(res.status).toBe(403);
      expect(resBody).toEqual({
        name: "ForbiddenError",
        message: "Usuário não pode executar esta operação.",
        action: 'Verifique se este usuário possui a feature "read:migration".',
        status_code: 403,
      });
    });

    test("should return PasswordExpiredError if the user's password expired", async () => {
      const expiredUser = await user.expireUserPassword(
        await user.create({
          username: "expiredUser",
          email: "expiredUseremail@example.com",
          password: "Senha@123",
        }),
      );
      const newSession = await session.create(expiredUser);
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/migrations`,
        {
          method: "GET",
          headers: {
            Cookie: `session_id=${newSession.token}`,
          },
        },
      );
      const resBody = await res.json();
      expect(res.status).toBe(403);
      expect(resBody).toEqual({
        name: "PasswordExpiredError",
        message: "A sua senha expirou.",
        action: "Atualize sua senha para continuar com o acesso.",
        status_code: 403,
      });
    });
  });
});
