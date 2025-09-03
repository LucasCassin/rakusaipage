import user from "models/user.js";
import session from "models/session";
import orchestrator from "tests/orchestrator.js";

let testUser, testSession;

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
  testUser = await user.create({
    username: "testuser",
    email: "testuser@example.com",
    password: "Senha@123",
  });
  testUser = await user.update({
    id: testUser.id,
    password: "Senha@123",
  });
  testSession = await session.create(testUser);
});

describe("GET /api/v1/user", () => {
  describe("Authenticated User", () => {
    test("should return user details for a valid session", async () => {
      const res = await fetch(`${orchestrator.webserverUrl}/api/v1/user`, {
        method: "GET",
        headers: {
          Cookie: `session_id=${testSession.token}`,
        },
      });

      const resBody = await res.json();
      expect(res.status).toBe(200);
      expect(resBody).toEqual({
        id: testUser.id,
        username: testUser.username,
        email: "t******r@example.com",
        features: [
          "create:session",
          "read:session:self",
          "read:user:self",
          "update:user:self",
          "nivel:taiko:iniciante",
        ],
        password_expires_at: testUser.password_expires_at.toISOString(),
        created_at: testUser.created_at.toISOString(),
        updated_at: testUser.updated_at.toISOString(),
      });
    });

    test("should return ValidationError for an invalid session token", async () => {
      const res = await fetch(`${orchestrator.webserverUrl}/api/v1/user`, {
        method: "GET",
        headers: {
          Cookie: `session_id=invalid`,
        },
      });

      const resBody = await res.json();
      expect(res.status).toBe(400);
      expect(resBody).toEqual({
        name: "ValidationError",
        message: '"token" deve possuir 96 caracteres.',
        action: 'Verifique o campo "token".',
        status_code: 400,
      });
    });

    test("should return ValidationSessionError for a non-existent session token", async () => {
      const res = await fetch(`${orchestrator.webserverUrl}/api/v1/user`, {
        method: "GET",
        headers: {
          Cookie: `session_id=${orchestrator.generateRandomToken()}`,
        },
      });

      const resBody = await res.json();
      expect(res.status).toBe(400);
      expect(resBody).toEqual({
        name: "ValidationSessionError",
        message: "Usuário não possui sessão ativa.",
        action: "Verifique se este usuário está logado.",
        status_code: 400,
      });
    });

    test("should return UnauthorizedError for a missing session token", async () => {
      const res = await fetch(`${orchestrator.webserverUrl}/api/v1/user`, {
        method: "GET",
      });

      const resBody = await res.json();
      expect(res.status).toBe(403);
      expect(resBody).toEqual({
        name: "ForbiddenError",
        message: "Usuário não pode executar esta operação.",
        action:
          'Verifique se este usuário possui a feature "read:session:self".',
        status_code: 403,
      });
    });

    describe("Revoke feature 'read:session:self'", () => {
      test("Should return ForbiddenError", async () => {
        await user.removeFeatures(testUser, ["read:session:self"]);

        const res = await fetch(`${orchestrator.webserverUrl}/api/v1/user`, {
          method: "GET",
          headers: {
            Cookie: `session_id=${testSession.token}`,
          },
        });

        await user.addFeatures(testUser, ["read:session:self"]);
        const resBody = await res.json();
        expect(res.status).toBe(403);
        expect(resBody).toEqual({
          name: "ForbiddenError",
          message: "Você não possui permissão para executar esta ação.",
          action:
            'Verifique se este usuário possui a feature "read:session:self" ou se a sessão realmente é do usuário ativo.',
          status_code: 403,
        });
        const expiredSession = await session.findOneSession({
          token: testSession.token,
        });
        expect(expiredSession).toBeDefined();

        const parsedCookiesFromResponse = orchestrator.parseSetCookies(res);
        expect(parsedCookiesFromResponse.session_id.value).toBe("invalid");
        expect(parsedCookiesFromResponse.session_id.maxAge).toBe(-1);
      });
    });

    test("should return user details for a valid session with expired password", async () => {
      const expiredUser = await user.expireUserPassword(
        await user.create({
          username: "expiredUser",
          email: "expiredUseremail@example.com",
          password: "Senha@123",
        }),
      );
      const newSession = await session.create(expiredUser);
      const res = await fetch(`${orchestrator.webserverUrl}/api/v1/user`, {
        method: "GET",
        headers: {
          Cookie: `session_id=${newSession.token}`,
        },
      });

      const resBody = await res.json();
      expect(res.status).toBe(200);
      expect(resBody).toEqual({
        id: expiredUser.id,
        username: expiredUser.username,
        email: "e**************l@example.com",
        features: [
          "create:session",
          "read:session:self",
          "read:user:self",
          "update:user:self",
          "nivel:taiko:iniciante",
        ],
        password_expires_at: expiredUser.password_expires_at.toISOString(),
        created_at: expiredUser.created_at.toISOString(),
        updated_at: expiredUser.updated_at.toISOString(),
      });
    });
  });
});
