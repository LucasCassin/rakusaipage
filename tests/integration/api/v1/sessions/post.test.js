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
  testUser = await user.update({
    id: testUser.id,
    password: "Senha@123",
  });
});

describe("POST /api/v1/sessions", () => {
  describe("Anonymous User", () => {
    describe("With valid credentials", () => {
      test("should create a new session and return the session token", async () => {
        const res = await fetch(
          `${orchestrator.webserverUrl}/api/v1/sessions`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              email: "testuser@example.com",
              password: "Senha@123",
            }),
          },
        );

        const resBody = await res.json();
        expect(res.status).toBe(201);
        expect(resBody).toHaveProperty("token");
        expect(resBody).toHaveProperty("expires_at");
        expect(resBody).toHaveProperty("created_at");
        expect(resBody).toHaveProperty("updated_at");
        expect(resBody).toHaveProperty("session_id");

        const sessionObjectInDatabase = await session.findOneSession(resBody);
        expect(sessionObjectInDatabase.user_id).toBe(testUser.id);

        const parsedCookiesFromResponse = orchestrator.parseSetCookies(res);
        expect(parsedCookiesFromResponse.session_id.name).toBe("session_id");
        expect(parsedCookiesFromResponse.session_id.value).toBe(resBody.token);
        expect(parsedCookiesFromResponse.session_id.maxAge).toBe(
          60 * 60 * 24 * 1,
        );
        expect(parsedCookiesFromResponse.session_id.path).toBe("/");
        expect(parsedCookiesFromResponse.session_id.httpOnly).toBe(true);
      });
      test("should return PasswordExpiredError if the user's password expired, but cookie should be created", async () => {
        const expiredUser = await user.expireUserPassword(
          await user.create({
            username: "expiredUser",
            email: "expiredUseremail@example.com",
            password: "Senha@123",
          }),
        );
        const res = await fetch(
          `${orchestrator.webserverUrl}/api/v1/sessions`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              email: "expiredUseremail@example.com",
              password: "Senha@123",
            }),
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
        const parsedCookiesFromResponse = orchestrator.parseSetCookies(res);

        const sessionsFound = await session.findOneSession({
          token: parsedCookiesFromResponse.session_id.value,
        });
        expect(sessionsFound.user_id).toBe(expiredUser.id);
        expect(parsedCookiesFromResponse.session_id.name).toBe("session_id");
        expect(parsedCookiesFromResponse.session_id.maxAge).toBe(
          60 * 60 * 24 * 1,
        );
        expect(parsedCookiesFromResponse.session_id.path).toBe("/");
        expect(parsedCookiesFromResponse.session_id.httpOnly).toBe(true);
      });
    });

    describe("With invalid credentials", () => {
      test("should return UnauthorizedError for an incorrect password", async () => {
        const res = await fetch(
          `${orchestrator.webserverUrl}/api/v1/sessions`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              email: "testuser@example.com",
              password: "Wrong@Password1",
            }),
          },
        );

        const resBody = await res.json();
        expect(res.status).toBe(401);
        expect(resBody).toEqual({
          name: "UnauthorizedError",
          message: "Dados não conferem.",
          action: "Verifique se os dados enviados estão corretos.",
          status_code: 401,
        });
      });

      test("should return UnauthorizedError for an incorrect email", async () => {
        const res = await fetch(
          `${orchestrator.webserverUrl}/api/v1/sessions`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              email: "testuser2@example.com",
              password: "Senha@123",
            }),
          },
        );

        const resBody = await res.json();
        expect(res.status).toBe(401);
        expect(resBody).toEqual({
          name: "UnauthorizedError",
          message: "Dados não conferem.",
          action: "Verifique se os dados enviados estão corretos.",
          status_code: 401,
        });
      });
    });

    describe("When the 'create:session' feature is revoked", () => {
      test("should return ForbiddenError", async () => {
        await user.removeFeatures(testUser, ["create:session"]);
        const res = await fetch(
          `${orchestrator.webserverUrl}/api/v1/sessions`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              email: "testuser@example.com",
              password: "Senha@123",
            }),
          },
        );
        await user.addFeatures(testUser, ["create:session"]);
        const resBody = await res.json();
        expect(res.status).toBe(403);
        expect(resBody).toEqual({
          name: "ForbiddenError",
          message: "Você não possui permissão para fazer login.",
          action:
            'Verifique se este usuário possui a feature "create:session".',
          status_code: 403,
        });
      });
    });

    describe("With missing or invalid fields", () => {
      test("should return ValidationError for a missing email", async () => {
        const res = await fetch(
          `${orchestrator.webserverUrl}/api/v1/sessions`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              password: "Senha@123",
            }),
          },
        );

        const resBody = await res.json();
        expect(res.status).toBe(400);
        expect(resBody).toEqual({
          name: "ValidationError",
          message: '"email" é um campo obrigatório.',
          action: 'Verifique o campo "email".',
          status_code: 400,
        });
      });

      test("should return ValidationError for a missing password", async () => {
        const res = await fetch(
          `${orchestrator.webserverUrl}/api/v1/sessions`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              email: "testuser@example.com",
            }),
          },
        );

        const resBody = await res.json();
        expect(res.status).toBe(400);
        expect(resBody).toEqual({
          name: "ValidationError",
          message: '"password" é um campo obrigatório.',
          action: 'Verifique o campo "password".',
          status_code: 400,
        });
      });
    });

    describe("Session management", () => {
      test("should expire previous sessions when creating a new one", async () => {
        await session.expireAllFromUser(testUser);

        const firstSession = await session.create(testUser);
        const res = await fetch(
          `${orchestrator.webserverUrl}/api/v1/sessions`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              email: "testuser@example.com",
              password: "Senha@123",
            }),
          },
        );

        const resBody = await res.json();
        expect(res.status).toBe(201);
        expect(resBody).toHaveProperty("token");
        expect(resBody.token).not.toBe(firstSession.token);

        const expiredSession = await session.findOneSession({
          token: firstSession.token,
        });
        expect(expiredSession).toBeUndefined();
      });
    });
  });
});
