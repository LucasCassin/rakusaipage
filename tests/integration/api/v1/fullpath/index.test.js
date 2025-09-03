import orchestrator from "tests/orchestrator.js";
import user from "models/user.js";
import session from "models/session.js";
import authentication from "models/authentication.js";
beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("Authenticated User", () => {
  describe("GET /api/v1/users/[username]", () => {
    test("should return the user's own details", async () => {
      let testUser = await user.create({
        username: "testuser1",
        email: "testuser1@example.com",
        password: "Senha@123",
      });
      testUser = await user.update({
        id: testUser.id,
        password: "Senha@123",
      });
      const resNewSession = await fetch(
        `${orchestrator.webserverUrl}/api/v1/sessions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: testUser.email,
            password: "Senha@123",
          }),
        },
      );
      const newSession = await resNewSession.json();
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
        email: "t*******1@example.com",
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
    test("should return PasswordExpiredError", async () => {
      let createdUser = await user.create({
        username: "testuser2",
        email: "testuser2@example.com",
        password: "Senha@123",
      });
      // const resCreatedUser = await fetch(
      //   `${orchestrator.webserverUrl}/api/v1/users`,
      //   {
      //     method: "POST",
      //     headers: {
      //       "Content-Type": "application/json",
      //     },
      //     body: JSON.stringify({
      //       username: "testUserFullPath2",
      //       email: "testuserfullpath2@example.com",
      //       password: "Senha@123",
      //     }),
      //   },
      // );
      // const createdUser = await resCreatedUser.json();
      // await user.expireUserPassword(createdUser);
      const resNewSession = await fetch(
        `${orchestrator.webserverUrl}/api/v1/sessions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: createdUser.email,
            password: "Senha@123",
          }),
        },
      );
      expect(resNewSession.status).toBe(403);
      const parsedCookiesFromResponse =
        orchestrator.parseSetCookies(resNewSession);

      const sessionsFound = await session.findOneSession({
        token: parsedCookiesFromResponse.session_id.value,
      });

      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/users/${createdUser.username}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${sessionsFound.token}`,
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
    test("should return PasswordExpiredError another case", async () => {
      let createdUser = await user.create({
        username: "testuser3",
        email: "testuser3@example.com",
        password: "Senha@123",
      });
      createdUser = await user.update({
        id: createdUser.id,
        password: "Senha@123",
      });
      const resNewSession = await fetch(
        `${orchestrator.webserverUrl}/api/v1/sessions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: createdUser.email,
            password: "Senha@123",
          }),
        },
      );
      const newSession = await resNewSession.json();
      await user.expireUserPassword(createdUser);
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/users/${createdUser.username}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${newSession.token}`,
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

  describe("PATCH /api/v1/users/[username]", () => {
    test("should update user's e-mail", async () => {
      // const resCreatedUser = await fetch(
      //   `${orchestrator.webserverUrl}/api/v1/users`,
      //   {
      //     method: "POST",
      //     headers: {
      //       "Content-Type": "application/json",
      //     },
      //     body: JSON.stringify({
      //       username: "testUserFullPath4",
      //       email: "testuserfullpath4@example.com",
      //       password: "Senha@123",
      //     }),
      //   },
      // );
      // const createdUser = await resCreatedUser.json();
      let createdUser = await user.create({
        username: "testuser4",
        email: "testuser4@example.com",
        password: "Senha@123",
      });
      createdUser = await user.update({
        id: createdUser.id,
        password: "Senha@123",
      });
      const resNewSession = await fetch(
        `${orchestrator.webserverUrl}/api/v1/sessions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: createdUser.email,
            password: "Senha@123",
          }),
        },
      );
      const newSession = await resNewSession.json();

      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/users/${createdUser.username}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${newSession.token}`,
          },
          body: JSON.stringify({
            email: "updatedtestuserfullpath4@example.com",
          }),
        },
      );

      const resBody = await res.json();
      expect(res.status).toBe(200);
      expect(resBody.email).toBe("u**********************4@example.com");
    });
    test("should return PasswordExpiredError when trying to update email", async () => {
      // const resCreatedUser = await fetch(
      //   `${orchestrator.webserverUrl}/api/v1/users`,
      //   {
      //     method: "POST",
      //     headers: {
      //       "Content-Type": "application/json",
      //     },
      //     body: JSON.stringify({
      //       username: "testUserFullPath5",
      //       email: "testuserfullpath5@example.com",
      //       password: "Senha@123",
      //     }),
      //   },
      // );
      // const createdUser = await resCreatedUser.json();
      let createdUser = await user.create({
        username: "testuser5",
        email: "testuser5@example.com",
        password: "Senha@123",
      });
      createdUser = await user.update({
        id: createdUser.id,
        password: "Senha@123",
      });
      const resNewSession = await fetch(
        `${orchestrator.webserverUrl}/api/v1/sessions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: createdUser.email,
            password: "Senha@123",
          }),
        },
      );
      const newSession = await resNewSession.json();
      await user.expireUserPassword(createdUser);

      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/users/${createdUser.username}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${newSession.token}`,
          },
          body: JSON.stringify({
            email: "updatedtestuserfullpath5@example.com",
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
    });
    test("should update user's password", async () => {
      // const resCreatedUser = await fetch(
      //   `${orchestrator.webserverUrl}/api/v1/users`,
      //   {
      //     method: "POST",
      //     headers: {
      //       "Content-Type": "application/json",
      //     },
      //     body: JSON.stringify({
      //       username: "testUserFullPath6",
      //       email: "testuserfullpath6@example.com",
      //       password: "Senha@123",
      //     }),
      //   },
      // );
      // const createdUser = await resCreatedUser.json();
      let createdUser = await user.create({
        username: "testuser6",
        email: "testuser6@example.com",
        password: "Senha@123",
      });
      createdUser = await user.update({
        id: createdUser.id,
        password: "Senha@123",
      });
      const resNewSession = await fetch(
        `${orchestrator.webserverUrl}/api/v1/sessions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: createdUser.email,
            password: "Senha@123",
          }),
        },
      );
      const newSession = await resNewSession.json();
      await user.expireUserPassword(createdUser);

      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/users/${createdUser.username}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${newSession.token}`,
          },
          body: JSON.stringify({
            password: "oth3rP@ssword",
          }),
        },
      );

      const userUpdatedData = await user.findOneUser({
        username: createdUser.username,
      });
      const resBody = await res.json();
      expect(res.status).toBe(200);
      expect(Date.parse(resBody.password_expires_at)).toBeGreaterThan(
        Date.parse(resBody.created_at) + 89 * 24 * 60 * 60 * 1000,
      );
      await expect(
        authentication.comparePassword(
          "oth3rP@ssword",
          userUpdatedData.password,
        ),
      ).resolves.not.toThrow();
      await expect(
        authentication.comparePassword("Senha@123", userUpdatedData.password),
      ).rejects.toThrow(
        expect.objectContaining({
          message: "A senha informada não confere com a senha do usuário.",
          action:
            "Verifique se a senha informada está correta e tente novamente.",
        }),
      );
    });
  });
});

describe("Anonymous User", () => {
  describe("GET /api/v1/users/[username]", () => {
    test("should return ValidationSessionError expired session", async () => {
      // const resCreatedUser = await fetch(
      //   `${orchestrator.webserverUrl}/api/v1/users`,
      //   {
      //     method: "POST",
      //     headers: {
      //       "Content-Type": "application/json",
      //     },
      //     body: JSON.stringify({
      //       username: "testUserFullPath7",
      //       email: "testuserfullpath7@example.com",
      //       password: "Senha@123",
      //     }),
      //   },
      // );
      // const createdUser = await resCreatedUser.json();
      let createdUser = await user.create({
        username: "testuser7",
        email: "testuser7@example.com",
        password: "Senha@123",
      });
      createdUser = await user.update({
        id: createdUser.id,
        password: "Senha@123",
      });
      const resNewSession = await fetch(
        `${orchestrator.webserverUrl}/api/v1/sessions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: createdUser.email,
            password: "Senha@123",
          }),
        },
      );
      const newSession = await resNewSession.json();
      await session.expireAllFromUser(createdUser);
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/users/${createdUser.username}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${newSession.token}`,
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

      const parsedCookiesFromResponse = orchestrator.parseSetCookies(res);
      expect(parsedCookiesFromResponse.session_id.name).toBe("session_id");
      expect(parsedCookiesFromResponse.session_id.value).toBe("invalid");
      expect(parsedCookiesFromResponse.session_id.maxAge).toBe(-1);
      expect(parsedCookiesFromResponse.session_id.path).toBe("/");
      expect(parsedCookiesFromResponse.session_id.httpOnly).toBe(true);
    });
  });
});
