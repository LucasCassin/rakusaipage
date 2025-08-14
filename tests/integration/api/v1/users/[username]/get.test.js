import password from "models/password";
import session from "models/session";
import user from "models/user.js";
import orchestrator from "tests/orchestrator.js";
let testUser;

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
  testUser = await user.create({
    username: "testuser",
    email: "testuser@example.com",
    password: "Senha@123",
  });
});

describe("GET /api/v1/users/[username]", () => {
  describe("Authenticated User", () => {
    test("should return the user's own details", async () => {
      await session.expireAllFromUser(testUser);
      const newSession = await session.create(testUser);

      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/users/${testUser.username}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${newSession.token}`,
          },
        },
      );

      expect(res.status).toBe(200);
      const resBody = await res.json();
      expect(resBody).toEqual({
        id: testUser.id,
        username: testUser.username,
        email: "t******r@example.com",
        features: testUser.features,
        password_expires_at: testUser.password_expires_at.toISOString(),
        created_at: testUser.created_at.toISOString(),
        updated_at: testUser.updated_at.toISOString(),
      });
    });

    test("should return another user's details if authorized", async () => {
      const otherUser = await user.create({
        username: "otheruser",
        email: "otheruser@example.com",
        password: "Senha@123",
      });

      await session.expireAllFromUser(testUser);
      const newSession = await session.create(testUser);
      await user.addFeatures(testUser, ["read:user:other"]);

      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/users/${otherUser.username}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${newSession.token}`,
          },
        },
      );
      await user.removeFeatures(testUser, ["read:user:other"]);
      expect(res.status).toBe(200);
      const resBody = await res.json();
      expect(resBody).toEqual({
        id: otherUser.id,
        username: otherUser.username,
        features: otherUser.features,
        password_expires_at: otherUser.password_expires_at.toISOString(),
        created_at: otherUser.created_at.toISOString(),
        updated_at: otherUser.updated_at.toISOString(),
      });
    });

    test("should return NotFoundError for a non-existent user", async () => {
      await session.expireAllFromUser(testUser);
      const newSession = await session.create(testUser);

      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/users/nonexistentuser`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${newSession.token}`,
          },
        },
      );

      expect(res.status).toBe(404);
      const resBody = await res.json();
      expect(resBody).toEqual({
        name: "NotFoundError",
        message: "Usuário não encontrado.",
        action: 'Verifique se o usuário "nonexistentuser" existe.',
        status_code: 404,
      });
    });

    test("should return ForbiddenError for a user with revoked 'read:user:self' or 'read:user:other' feature", async () => {
      await session.expireAllFromUser(testUser);
      const newSession = await session.create(testUser);
      await user.removeFeatures(testUser, [
        "read:user:other",
        "read:user:self",
      ]);

      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/users/${testUser.username}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${newSession.token}`,
          },
        },
      );
      await user.addFeatures(testUser, ["read:user:self"]);
      expect(res.status).toBe(403);
      const resBody = await res.json();
      expect(resBody).toEqual({
        name: "ForbiddenError",
        message: "Usuário não pode executar esta operação.",
        action:
          'Verifique se o usuário está logado e possui uma das features "read:user:self" ou "read:user:other".',
        status_code: 403,
      });
    });

    test("should return ForbiddenError for a user with revoked 'read:user:self' but with 'read:user:other' feature when trying to access user's own details", async () => {
      await session.expireAllFromUser(testUser);
      const newSession = await session.create(testUser);
      await user.removeFeatures(testUser, ["read:user:self"]);
      await user.addFeatures(testUser, ["read:user:other"]);

      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/users/${testUser.username}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${newSession.token}`,
          },
        },
      );
      await user.addFeatures(testUser, ["read:user:self"]);
      await user.removeFeatures(testUser, ["read:user:other"]);
      expect(res.status).toBe(403);
      const resBody = await res.json();
      expect(resBody).toEqual({
        name: "ForbiddenError",
        message: "Usuário não pode executar esta operação.",
        action:
          'Verifique se o usuário está logado e possui uma das features "read:user:self" ou "read:user:other".',
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
        `${orchestrator.webserverUrl}/api/v1/users/anyuser`,
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

  describe("Anonymous User", () => {
    test("should return ForbiddenError for unauthorized access", async () => {
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/users/${testUser.username}`,
        {
          method: "GET",
        },
      );

      expect(res.status).toBe(403);
      const resBody = await res.json();
      expect(resBody).toEqual({
        name: "ForbiddenError",
        message: "Usuário não pode executar esta operação.",
        action:
          'Verifique se o usuário está logado e possui uma das features "read:user:self" ou "read:user:other".',
        status_code: 403,
      });
    });
  });
});
