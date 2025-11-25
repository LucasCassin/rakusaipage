import orchestrator from "tests/orchestrator.js";
import userModel from "models/user.js";
import tokenModel from "models/token.js";
import sessionModel from "models/session.js";
import database from "infra/database.js";

describe("POST /api/v1/password/forgot", () => {
  beforeAll(async () => {
    await orchestrator.waitForAllServices();
    await orchestrator.clearDatabase();
    await orchestrator.runPendingMigrations();
  });

  describe("Anonymous User", () => {
    test("With valid email should create token and return 200", async () => {
      const user = await userModel.create({
        username: "forgotUser",
        email: "forgot@example.com",
        password: "ValidPass123!",
      });

      const response = await fetch(
        `${orchestrator.webserverUrl}/api/v1/password/forgot`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: "forgot@example.com" }),
        },
      );

      const responseBody = await response.json();

      expect(response.status).toBe(200);
      expect(responseBody.message).toEqual(
        "Se o e-mail estiver cadastrado, você receberá um link de recuperação em instantes.",
      );

      // Verifica no banco se o token foi criado
      const result = await database.query({
        text: `SELECT * FROM tokens WHERE user_id = $1 AND type = $2`,
        values: [user.id, tokenModel.TYPES.PASSWORD_RESET],
      });
      const savedToken = result.rows[0];

      expect(savedToken).toBeDefined();
      expect(savedToken.used).toBe(false);
    });

    test("With non-existent email should return 200 (Security: User Enumeration Protection)", async () => {
      const response = await fetch(
        `${orchestrator.webserverUrl}/api/v1/password/forgot`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: "ghost@example.com" }),
        },
      );

      const responseBody = await response.json();

      expect(response.status).toBe(200);
      expect(responseBody.message).toBeDefined();
    });

    test("With invalid email format should return 400", async () => {
      const response = await fetch(
        `${orchestrator.webserverUrl}/api/v1/password/forgot`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: "not-an-email" }),
        },
      );

      expect(response.status).toBe(400);
    });

    test("With unsupported HTTP method (GET) should return 405", async () => {
      const response = await fetch(
        `${orchestrator.webserverUrl}/api/v1/password/forgot`,
        {
          method: "GET",
        },
      );

      expect(response.status).toBe(405);
    });
  });

  describe("Authenticated User", () => {
    test("User WITHOUT 'create:session' feature should receive 403 Forbidden", async () => {
      // 1. Cria usuário
      const user = await userModel.create({
        username: "blockedUser",
        email: "blocked@example.com",
        password: "ValidPass123!",
      });
      await userModel.removeFeatures(user, ["create:session"]);

      // 2. Cria sessão (login)
      const session = await sessionModel.create(user);

      const response = await fetch(
        `${orchestrator.webserverUrl}/api/v1/password/forgot`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify({ email: "blocked@example.com" }),
        },
      );
      expect(response.status).toBe(403);
    });

    test("User WITH 'create:session' feature should be able to request reset", async () => {
      const user = await userModel.create({
        username: "allowedUser",
        email: "allowed@example.com",
        password: "ValidPass123!",
      });

      const session = await sessionModel.create(user);

      const response = await fetch(
        `${orchestrator.webserverUrl}/api/v1/password/forgot`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify({ email: "allowed@example.com" }),
        },
      );

      expect(response.status).toBe(200);
    });
  });
});
