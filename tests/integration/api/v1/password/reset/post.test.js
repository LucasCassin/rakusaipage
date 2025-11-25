import orchestrator from "tests/orchestrator.js";
import userModel from "models/user.js";
import tokenModel from "models/token.js";
import sessionModel from "models/session.js";
import database from "infra/database.js";

describe("POST /api/v1/password/reset", () => {
  beforeAll(async () => {
    await orchestrator.waitForAllServices();
    await orchestrator.clearDatabase();
    await orchestrator.runPendingMigrations();
  });

  describe("Anonymous User", () => {
    test("With valid token should update password and allow login", async () => {
      // 1. Setup
      const user = await userModel.create({
        username: "anonReset",
        email: "anon@example.com",
        password: "OldPassword123!",
      });

      const token = await tokenModel.create({
        userId: user.id,
        type: tokenModel.TYPES.PASSWORD_RESET,
      });

      // 2. Action
      const response = await fetch(
        `${orchestrator.webserverUrl}/api/v1/password/reset`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token_model: token.token,
            password: "NewStrongPassword123!",
          }),
        },
      );

      const responseBody = await response.json();

      // 3. Assert
      expect(response.status).toBe(200);
      expect(responseBody.message).toMatch(/sucesso/i);

      const tokenCheck = await database.query({
        text: "SELECT * FROM tokens WHERE id = $1",
        values: [token.id],
      });
      expect(tokenCheck.rows[0].used).toBe(true);
    });

    test("With invalid token should return 401", async () => {
      const response = await fetch(
        `${orchestrator.webserverUrl}/api/v1/password/reset`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token_model: "invalid-token-string",
            password: "AnyPassword123!",
          }),
        },
      );
      expect(response.status).toBe(400);
    });
  });

  describe("Authenticated User", () => {
    test("Resetting OWN password (token matches logged user) should succeed", async () => {
      // 1. Setup: Usuário logado
      const user = await userModel.create({
        username: "ownReset",
        email: "own@example.com",
        password: "OldPassword123!",
      });
      const session = await sessionModel.create(user);
      const token = await tokenModel.create({
        userId: user.id,
        type: tokenModel.TYPES.PASSWORD_RESET,
      });

      // 2. Action: Tenta resetar estando logado
      const response = await fetch(
        `${orchestrator.webserverUrl}/api/v1/password/reset`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify({
            token_model: token.token,
            password: "MyNewPassword123!",
          }),
        },
      );

      // 3. Assert
      expect(response.status).toBe(200);

      // Verifica se a senha mudou (tentando logar com a nova)
      const loginResponse = await fetch(
        `${orchestrator.webserverUrl}/api/v1/sessions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "own@example.com",
            password: "MyNewPassword123!",
          }),
        },
      );
      expect(loginResponse.status).toBe(201); // ou 200, dependendo da rota session
    });

    test("Resetting ANOTHER user's password should return 403 Forbidden", async () => {
      // 1. Setup: Hacker (logado) e Vítima (dona do token)
      const hacker = await userModel.create({
        username: "hackerUser",
        email: "hacker@example.com",
        password: "HackerPassword123!",
      });
      const hackerSession = await sessionModel.create(hacker);

      const victim = await userModel.create({
        username: "victimUser",
        email: "victim@example.com",
        password: "VictimPassword123!",
      });
      const victimToken = await tokenModel.create({
        userId: victim.id,
        type: tokenModel.TYPES.PASSWORD_RESET,
      });

      // 2. Action: Hacker tenta usar o token da vítima
      const response = await fetch(
        `${orchestrator.webserverUrl}/api/v1/password/reset`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${hackerSession.token}`,
          },
          body: JSON.stringify({
            token_model: victimToken.token,
            password: "HackedPassword123!",
          }),
        },
      );

      const responseBody = await response.json();

      // 3. Assert
      expect(response.status).toBe(403);
      expect(responseBody.message).toMatch(/logado em outra conta/i);

      // Garante que o token NÃO foi queimado/usado
      const tokenCheck = await database.query({
        text: "SELECT * FROM tokens WHERE id = $1",
        values: [victimToken.id],
      });
      expect(tokenCheck.rows[0].used).toBe(false);
    });
  });
});
