import session from "models/session";
import user from "models/user.js";
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
  testSession = await session.create(testUser);
});

describe("DELETE /api/v1/sessions", () => {
  describe("Authenticated User", () => {
    describe("With a valid session", () => {
      test("should expire the current session and clear the session cookie", async () => {
        const res = await fetch(
          `${orchestrator.webserverUrl}/api/v1/sessions`,
          {
            method: "DELETE",
            headers: {
              Cookie: `session_id=${testSession.token}`,
            },
          },
        );

        const resBody = await res.json();
        expect(res.status).toBe(200);
        expect(resBody).toEqual({
          session_id: testSession.session_id,
          token: testSession.token,
          expires_at: resBody.expires_at,
          created_at: testSession.created_at.toISOString(),
          updated_at: resBody.updated_at,
        });

        expect(resBody.expires_at < resBody.created_at).toBe(true);
        expect(resBody.updated_at > resBody.created_at).toBe(true);

        const expiredSession = await session.findOneSession({
          token: testSession.token,
        });
        expect(expiredSession).toBeUndefined();

        const parsedCookiesFromResponse = orchestrator.parseSetCookies(res);
        expect(parsedCookiesFromResponse.session_id.value).toBe("invalid");
        expect(parsedCookiesFromResponse.session_id.maxAge).toBe(-1);
      });
    });

    describe("With an invalid session", () => {
      test("should return ValidationError for an invalid session token", async () => {
        const res = await fetch(
          `${orchestrator.webserverUrl}/api/v1/sessions`,
          {
            method: "DELETE",
            headers: {
              Cookie: `session_id=invalid`,
            },
          },
        );

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
        const res = await fetch(
          `${orchestrator.webserverUrl}/api/v1/sessions`,
          {
            method: "DELETE",
            headers: {
              Cookie: `session_id=${orchestrator.generateRandomToken()}`,
            },
          },
        );

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
        const res = await fetch(
          `${orchestrator.webserverUrl}/api/v1/sessions`,
          {
            method: "DELETE",
          },
        );
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
    });

    describe("Revoke feature 'read:session:self'", () => {
      test("Should return ForbiddenError", async () => {
        await session.expireAllFromUser(testUser);
        const newSession = await session.create(testUser);
        await user.removeFeatures(testUser, ["read:session:self"]);

        const res = await fetch(
          `${orchestrator.webserverUrl}/api/v1/sessions`,
          {
            method: "DELETE",
            headers: {
              cookie: `session_id=${newSession.token}`,
            },
          },
        );

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
      });
    });

    test("should expire the current session and clear the session cookie if the user's password expired", async () => {
      const expiredUser = await user.expireUserPassword(
        await user.create({
          username: "expiredUser",
          email: "expiredUseremail@example.com",
          password: "Senha@123",
        }),
      );
      const newSession = await session.create(expiredUser);
      const res = await fetch(`${orchestrator.webserverUrl}/api/v1/sessions`, {
        method: "DELETE",
        headers: {
          Cookie: `session_id=${newSession.token}`,
        },
      });
      const resBody = await res.json();
      expect(res.status).toBe(200);
      expect(resBody).toEqual({
        session_id: newSession.session_id,
        token: newSession.token,
        expires_at: resBody.expires_at,
        created_at: newSession.created_at.toISOString(),
        updated_at: resBody.updated_at,
      });

      expect(resBody.expires_at < resBody.created_at).toBe(true);
      expect(resBody.updated_at > resBody.created_at).toBe(true);

      const expiredSession = await session.findOneSession({
        token: newSession.token,
      });
      expect(expiredSession).toBeUndefined();

      const parsedCookiesFromResponse = orchestrator.parseSetCookies(res);
      expect(parsedCookiesFromResponse.session_id.value).toBe("invalid");
      expect(parsedCookiesFromResponse.session_id.maxAge).toBe(-1);
    });
  });
});
