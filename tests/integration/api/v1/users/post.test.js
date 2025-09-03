import user from "models/user";
import session from "models/session";
import orchestrator from "tests/orchestrator.js";
import { version as uuidVersion } from "uuid";
let testUser;
let newSession;
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

describe("POST /api/v1/users Endpoint", () => {
  describe("Anonymous User", () => {
    test("should return ForbiddenError for unauthorized access", async () => {
      const res = await fetch(`${orchestrator.webserverUrl}/api/v1/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: "testuser",
          email: "testuser@example.com",
          password: "Senha@123",
        }),
      });

      expect(res.status).toBe(403);
      const resBody = await res.json();
      expect(resBody).toEqual({
        name: "ForbiddenError",
        message: "Usuário não pode executar esta operação.",
        action: 'Verifique se este usuário possui a feature "create:user".',
        status_code: 403,
      });
    });
  });

  describe("Authenticated User", () => {
    beforeEach(async () => {
      await session.expireAllFromUser(testUser);
      newSession = await session.create(testUser);
      await user.addFeatures(testUser, ["create:user"]);
    });
    afterEach(async () => {
      await user.updateFeatures(testUser, [
        "create:session",
        "read:session:self",
        "read:user:self",
        "update:user:self",
        "nivel:taiko:iniciante",
      ]);
    });
    test("Should create a new user and return it with default features", async () => {
      const res = await fetch(`${orchestrator.webserverUrl}/api/v1/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `session_id=${newSession.token}`,
        },
        body: JSON.stringify({
          username: "testuser2",
          email: "testuser2@example.com",
          password: "Senha@123",
        }),
      });

      expect(res.status).toBe(201);
      const resBody = await res.json();
      expect(resBody).toEqual(
        expect.objectContaining({
          id: resBody.id,
          username: "testuser2",
          email: "t*******2@example.com",
          features: [
            "create:session",
            "read:session:self",
            "read:user:self",
            "update:user:self",
            "nivel:taiko:iniciante",
          ],
          password_expires_at: resBody.password_expires_at,
          created_at: resBody.created_at,
          updated_at: resBody.updated_at,
        }),
      );
      expect(uuidVersion(resBody.id)).toBe(4);
      expect(Date.parse(resBody.created_at)).not.toBeNaN();
      expect(Date.parse(resBody.updated_at)).not.toBeNaN();
      expect(Date.parse(resBody.password_expires_at)).not.toBeNaN();
      // expect(Date.parse(resBody.password_expires_at)).toBeGreaterThan(
      //   Date.parse(resBody.updated_at) + 89 * 24 * 60 * 60 * 1000,
      // );
      expect(Date.parse(resBody.password_expires_at)).toBeLessThan(
        Date.parse(resBody.created_at),
      );
    });
    test("should return ValidationError for missing required fields", async () => {
      const res = await fetch(`${orchestrator.webserverUrl}/api/v1/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `session_id=${newSession.token}`,
        },
        body: JSON.stringify({ username: "testuser" }),
      });

      expect(res.status).toBe(400);
      const resBody = await res.json();
      expect(resBody).toEqual({
        name: "ValidationError",
        message: '"email" é um campo obrigatório.',
        action: 'Verifique o campo "email".',
        status_code: 400,
      });
    });
    test("should return ValidationError for invalid email format", async () => {
      const res = await fetch(`${orchestrator.webserverUrl}/api/v1/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `session_id=${newSession.token}`,
        },
        body: JSON.stringify({
          username: "testuser",
          email: "invalid-email",
          password: "Senha@123",
        }),
      });

      expect(res.status).toBe(400);
      const resBody = await res.json();
      expect(resBody).toEqual({
        name: "ValidationError",
        message: '"email" deve conter um email válido.',
        action: 'Verifique o campo "email".',
        status_code: 400,
      });
    });

    test("should return ValidationError for a short password", async () => {
      const res = await fetch(`${orchestrator.webserverUrl}/api/v1/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `session_id=${newSession.token}`,
        },
        body: JSON.stringify({
          username: "testuser2",
          email: "testuser2@example.com",
          password: "123",
        }),
      });

      expect(res.status).toBe(400);
      const resBody = await res.json();
      expect(resBody).toEqual({
        name: "ValidationError",
        message: '"password" deve conter no mínimo 8 caracteres.',
        action: 'Verifique o campo "password".',
        status_code: 400,
      });
    });

    test("should return ValidationError for a weak password", async () => {
      const res = await fetch(`${orchestrator.webserverUrl}/api/v1/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `session_id=${newSession.token}`,
        },
        body: JSON.stringify({
          username: "testuser3",
          email: "testuser3@example.com",
          password: "abcd1234",
        }),
      });

      expect(res.status).toBe(400);
      const resBody = await res.json();
      expect(resBody).toEqual({
        name: "ValidationError",
        message:
          '"password" deve conter pelo menos 1 letra maiúscula, 1 letra minúscula, 1 número e 1 caractere especial.',
        action: 'Verifique o campo "password".',
        status_code: 400,
      });
    });

    test("should return ValidationError for duplicate username", async () => {
      const userPayload = {
        username: "duplicateuser",
        email: "duplicateuser@example.com",
        password: "Senha@123",
      };
      await user.create(userPayload);

      const res = await fetch(`${orchestrator.webserverUrl}/api/v1/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `session_id=${newSession.token}`,
        },
        body: JSON.stringify({
          username: userPayload.username,
          email: "otheremail@example.com",
          password: "Senha@123",
        }),
      });

      expect(res.status).toBe(400);
      const resBody = await res.json();
      expect(resBody).toEqual({
        name: "ValidationError",
        message: "O 'username' informado já está sendo usado.",
        action: "Por favor, escolha outro 'username' e tente novamente.",
        status_code: 400,
      });
    });

    test("should return ValidationError for duplicate email", async () => {
      const userPayload = {
        username: "uniqueuser",
        email: "duplicateemail@example.com",
        password: "Senha@123",
      };
      await user.create(userPayload);

      const res = await fetch(`${orchestrator.webserverUrl}/api/v1/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `session_id=${newSession.token}`,
        },
        body: JSON.stringify({
          username: "otheruniqueuser",
          email: userPayload.email,
          password: "Senha@123",
        }),
      });

      expect(res.status).toBe(400);
      const resBody = await res.json();
      expect(resBody).toEqual({
        name: "ValidationError",
        message: "O email informado já está sendo usado.",
        action: "Por favor, escolha outro email e tente novamente.",
        status_code: 400,
      });
    });
  });
});
