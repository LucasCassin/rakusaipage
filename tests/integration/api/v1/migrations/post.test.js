import orchestrator from "tests/orchestrator.js";
import user from "models/user.js";
import session from "models/session.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("POST /api/v1/migrations", () => {
  describe("Anonymous User", () => {
    describe("Attempting to run pending migrations", () => {
      test("should return ForbiddenError for unauthorized access", async () => {
        const res = await fetch(
          `${orchestrator.webserverUrl}/api/v1/migrations`,
          {
            method: "POST",
          },
        );

        const resBody = await res.json();
        expect(res.status).toBe(403);
        expect(resBody).toEqual({
          name: "ForbiddenError",
          message: "Usuário não pode executar esta operação.",
          action:
            'Verifique se este usuário possui a feature "create:migration".',
          status_code: 403,
        });
      });
    });
  });

  describe("Authenticated User", () => {
    describe("Running pending migrations", () => {
      let newSession;

      test("should successfully run migrations for the first time", async () => {
        const newUser = await user.create({
          username: "testuser",
          email: "testuser@example.com",
          password: "Senha@123",
        });
        newSession = await session.create(newUser);
        await user.addFeatures(newUser, ["create:migration"]);

        const res = await fetch(
          `${orchestrator.webserverUrl}/api/v1/migrations`,
          {
            method: "POST",
            headers: {
              Cookie: `session_id=${newSession.token}`,
            },
          },
        );

        expect(res.status).toBe(200);
        const resBody = await res.json();
        expect(Array.isArray(resBody)).toBe(true);
        expect(resBody.length).toBe(0);
      });

      test("should return ForbiddenError if the user lacks the 'create:migration' feature", async () => {
        const newUser = await user.create({
          username: "testuser2",
          email: "testuser2@example.com",
          password: "Senha@123",
        });
        newSession = await session.create(newUser);

        const res = await fetch(
          `${orchestrator.webserverUrl}/api/v1/migrations`,
          {
            method: "POST",
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
          action:
            'Verifique se este usuário possui a feature "create:migration".',
          status_code: 403,
        });
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
          method: "POST",
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
