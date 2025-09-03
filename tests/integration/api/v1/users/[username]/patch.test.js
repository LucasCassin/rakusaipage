import authentication from "models/authentication";
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
  testUser = await user.update({
    id: testUser.id,
    password: "Senha@123",
  });
});

describe("PATCH /api/v1/users/[username]", () => {
  describe("Authenticated User", () => {
    afterEach(async () => {
      await user.updateFeatures(testUser, [
        "create:session",
        "read:session:self",
        "read:user:self",
        "update:user:self",
      ]);
    });

    test("should allow the user to update their own details", async () => {
      await session.expireAllFromUser(testUser);
      const newSession = await session.create(testUser);
      await user.addFeatures(testUser, ["block:other:update:self"]);
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/users/${testUser.username}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${newSession.token}`,
          },
          body: JSON.stringify({ email: "updated@example.com" }),
        },
      );

      const resBody = await res.json();
      expect(res.status).toBe(200);
      expect(resBody.email).toBe("u*****d@example.com");
    });

    test("should allow the user to update their own password even if it's expired", async () => {
      const expiredUser = await user.expireUserPassword(
        await user.create({
          username: "expiredUser2",
          email: "expiredUseremail2@example.com",
          password: "Senha@123",
        }),
      );
      const newSession = await session.create(expiredUser);

      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/users/${expiredUser.username}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${newSession.token}`,
          },
          body: JSON.stringify({ password: "oth3rP@ssword" }),
        },
      );
      const userUpdatedData = await user.findOneUser({
        username: expiredUser.username,
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
        authentication.comparePassword(
          expiredUser.password,
          userUpdatedData.password,
        ),
      ).rejects.toThrow(
        expect.objectContaining({
          message: "A senha informada não confere com a senha do usuário.",
          action:
            "Verifique se a senha informada está correta e tente novamente.",
        }),
      );
    });

    test("should allow the user to update their own features with 'update:user:features:self'", async () => {
      await session.expireAllFromUser(testUser);
      const newSession = await session.create(testUser);
      await user.addFeatures(testUser, ["update:user:features:self"]);

      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/users/${testUser.username}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${newSession.token}`,
          },
          body: JSON.stringify({ features: ["update:user:features:other"] }),
        },
      );
      const resBody = await res.json();
      const updatedUser = await user.findOneUser({
        username: testUser.username,
      });

      expect(res.status).toBe(200);
      expect(resBody.features).toEqual(["update:user:features:other"]);
      expect(updatedUser.features).toEqual(["update:user:features:other"]);
      expect(updatedUser.updated_at > testUser.updated_at).toBe(true);
    });

    test("should allow the user to remove all their features by providing an empty array", async () => {
      await session.expireAllFromUser(testUser);
      const newSession = await session.create(testUser);
      await user.addFeatures(testUser, ["update:user:features:self"]);

      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/users/${testUser.username}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${newSession.token}`,
          },
          body: JSON.stringify({ features: [] }),
        },
      );

      const resBody = await res.json();
      const updatedUser = await user.findOneUser({
        username: testUser.username,
      });

      expect(res.status).toBe(200);
      expect(resBody.features).toEqual([]);
      expect(updatedUser.features).toEqual([]);
      expect(updatedUser.updated_at > testUser.updated_at).toBe(true);
    });

    test("should allow authorized user to update another user's password", async () => {
      const otherUser = await user.create({
        username: "otheruser2",
        email: "otheruser2@example.com",
        password: "Senha@123",
      });

      await session.expireAllFromUser(testUser);
      const newSession = await session.create(testUser);
      await user.addFeatures(testUser, ["update:user:other"]);

      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/users/${otherUser.username}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${newSession.token}`,
          },
          body: JSON.stringify({ password: "oth3rP@ssword" }),
        },
      );
      const otherUserData = await user.findOneUser({
        username: otherUser.username,
      });
      const resBody = await res.json();
      expect(res.status).toBe(200);
      expect(Date.parse(resBody.password_expires_at)).toEqual(
        Date.parse(resBody.created_at) - 1 * 24 * 60 * 60 * 1000,
      );
      await expect(
        authentication.comparePassword("oth3rP@ssword", otherUserData.password),
      ).resolves.not.toThrow();
      await expect(
        authentication.comparePassword(
          otherUser.password,
          otherUserData.password,
        ),
      ).rejects.toThrow(
        expect.objectContaining({
          message: "A senha informada não confere com a senha do usuário.",
          action:
            "Verifique se a senha informada está correta e tente novamente.",
        }),
      );
    });

    test("should allow authorized user to update another user's features", async () => {
      const otherUser = await user.create({
        username: "otheruser21",
        email: "otheruser21@example.com",
        password: "Senha@123",
      });

      await session.expireAllFromUser(testUser);
      const newSession = await session.create(testUser);
      await user.addFeatures(testUser, ["update:user:features:other"]);

      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/users/${otherUser.username}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${newSession.token}`,
          },
          body: JSON.stringify({ features: ["read:session:self"] }),
        },
      );
      const otherUserData = await user.findOneUser({
        username: otherUser.username,
      });
      const resBody = await res.json();
      expect(res.status).toBe(200);
      expect(otherUserData.features).toEqual(["read:session:self"]);
      expect(resBody.features).toEqual(["read:session:self"]);
      expect(otherUserData.updated_at > otherUser.updated_at).toBe(true);
    });

    test("should allow the user to remove all features of another user by providing an empty array", async () => {
      const otherUser = await user.create({
        username: "otheruseremptyfeatures",
        email: "otheruseremptyfeatures@example.com",
        password: "Senha@123",
      });

      await session.expireAllFromUser(testUser);
      const newSession = await session.create(testUser);
      await user.addFeatures(testUser, ["update:user:features:other"]);

      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/users/${otherUser.username}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${newSession.token}`,
          },
          body: JSON.stringify({ features: [] }),
        },
      );

      const resBody = await res.json();
      const updatedUser = await user.findOneUser({
        username: otherUser.username,
      });

      expect(res.status).toBe(200);
      expect(resBody.features).toEqual([]);
      expect(updatedUser.features).toEqual([]);
      expect(updatedUser.updated_at > otherUser.updated_at).toBe(true);
    });

    test("should return ForbiddenError for user without 'update:user:self' or 'update:user:other' feature", async () => {
      await session.expireAllFromUser(testUser);
      const newSession = await session.create(testUser);
      await user.removeFeatures(testUser, ["update:user:self"]);

      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/users/${testUser.username}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${newSession.token}`,
          },
          body: JSON.stringify({ email: "unauthorized@example.com" }),
        },
      );

      expect(res.status).toBe(403);
      const resBody = await res.json();
      expect(resBody).toEqual({
        name: "ForbiddenError",
        message: "Usuário não pode executar esta operação.",
        action:
          'Verifique se o usuário está logado e possui uma das features "update:user:self", "update:user:other", "update:user:features:self" ou "update:user:features:self".',
        status_code: 403,
      });
    });

    test("should return ForbiddenError for user without 'update:user:self' and with 'update:user:other' feature", async () => {
      await session.expireAllFromUser(testUser);
      const newSession = await session.create(testUser);
      await user.removeFeatures(testUser, ["update:user:self"]);
      await user.addFeatures(testUser, ["update:user:other"]);
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/users/${testUser.username}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${newSession.token}`,
          },
          body: JSON.stringify({ email: "unauthorized@example.com" }),
        },
      );

      expect(res.status).toBe(403);
      const resBody = await res.json();
      expect(resBody).toEqual({
        name: "ForbiddenError",
        message: "Usuário não pode executar esta operação.",
        action:
          'Verifique se o usuário está logado e possui uma das features "update:user:self", "update:user:other", "update:user:features:self" ou "update:user:features:self".',
        status_code: 403,
      });
    });

    test("should return ForbiddenError for user with 'update:user:self' and without 'update:user:other' feature", async () => {
      await session.expireAllFromUser(testUser);
      const newSession = await session.create(testUser);
      await user.create({
        username: "otheruser46",
        email: "otheruser46@example.com",
        password: "Senha@123",
      });
      await user.addFeatures(testUser, ["update:user:self"]);
      await user.removeFeatures(testUser, ["update:user:other"]);
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/users/otheruser46`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${newSession.token}`,
          },
          body: JSON.stringify({ email: "unauthorized@example.com" }),
        },
      );

      expect(res.status).toBe(403);
      const resBody = await res.json();
      expect(resBody).toEqual({
        name: "ForbiddenError",
        message: "Usuário não pode executar esta operação.",
        action:
          'Verifique se o usuário está logado e possui uma das features "update:user:self", "update:user:other", "update:user:features:self" ou "update:user:features:self".',
        status_code: 403,
      });
    });

    test("should return ForbiddenError for user without 'update:user:features:self' or 'update:user:features:other' feature", async () => {
      await session.expireAllFromUser(testUser);
      const newSession = await session.create(testUser);

      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/users/${testUser.username}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${newSession.token}`,
          },
          body: JSON.stringify({ features: [] }),
        },
      );

      const resBody = await res.json();
      expect(res.status).toBe(403);
      expect(resBody).toEqual({
        name: "ForbiddenError",
        message: "Usuário não pode executar esta operação.",
        action:
          'Verifique se o usuário está logado e possui uma das features "update:user:self", "update:user:other", "update:user:features:self" ou "update:user:features:self".',
        status_code: 403,
      });
    });

    test("should return ForbiddenError for user without 'update:user:features:self' and with 'update:user:features:other' feature", async () => {
      await session.expireAllFromUser(testUser);
      const newSession = await session.create(testUser);

      // Remove the 'update:user:features:self' feature to test the case
      await user.removeFeatures(testUser, ["update:user:features:self"]);
      // Ensure the user only has 'update:user:features:other'
      await user.addFeatures(testUser, ["update:user:features:other"]);
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/users/${testUser.username}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${newSession.token}`,
          },
          body: JSON.stringify({ features: [] }),
        },
      );

      const resBody = await res.json();
      expect(res.status).toBe(403);
      expect(resBody).toEqual({
        name: "ForbiddenError",
        message: "Usuário não pode executar esta operação.",
        action:
          'Verifique se o usuário está logado e possui uma das features "update:user:self", "update:user:other", "update:user:features:self" ou "update:user:features:self".',
        status_code: 403,
      });
    });

    test("should return ForbiddenError for user with 'update:user:features:self' and without 'update:user:features:other' feature", async () => {
      await session.expireAllFromUser(testUser);
      const newSession = await session.create(testUser);
      await user.create({
        username: "otheruser44",
        email: "otheruser44@example.com",
        password: "Senha@123",
      }); // Create another user to test against

      // Remove the 'update:user:features:self' feature to test the case
      await user.addFeatures(testUser, ["update:user:features:self"]);
      // Ensure the user only has 'update:user:features:other'
      await user.removeFeatures(testUser, ["update:user:features:other"]);
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/users/otheruser44`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${newSession.token}`,
          },
          body: JSON.stringify({ features: [] }),
        },
      );

      const resBody = await res.json();
      expect(res.status).toBe(403);
      expect(resBody).toEqual({
        name: "ForbiddenError",
        message: "Usuário não pode executar esta operação.",
        action:
          'Verifique se o usuário está logado e possui uma das features "update:user:self", "update:user:other", "update:user:features:self" ou "update:user:features:self".',
        status_code: 403,
      });
    });

    test("should return ForbiddenError for user without 'update:user:features:other' and with 'update:user:other' feature", async () => {
      await session.expireAllFromUser(testUser);
      const newSession = await session.create(testUser);
      await user.create({
        username: "otheruser45",
        email: "otheruser45@example.com",
        password: "Senha@123",
      }); // Create another user to test against

      // Remove the 'update:user:features:self' feature to test the case
      await user.addFeatures(testUser, ["update:user:other"]);
      // Ensure the user only has 'update:user:features:other'
      await user.removeFeatures(testUser, ["update:user:features:other"]);
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/users/otheruser45`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${newSession.token}`,
          },
          body: JSON.stringify({ features: [] }),
        },
      );

      const resBody = await res.json();
      expect(res.status).toBe(403);
      expect(resBody).toEqual({
        name: "ForbiddenError",
        message: "Usuário não pode executar esta operação.",
        action:
          'Verifique se o usuário está logado e possui uma das features "update:user:self", "update:user:other", "update:user:features:self" ou "update:user:features:self".',
        status_code: 403,
      });
    });

    test("should return NonEditableUserError for other user with 'block:other:update:self' feature", async () => {
      await session.expireAllFromUser(testUser);
      const newSession = await session.create(testUser);
      const otherUser = await user.create({
        username: "otheruser78",
        email: "otheruser78@example.com",
        password: "Senha@123",
      }); // Create another user to test against
      await user.addFeatures(otherUser, ["block:other:update:self"]);
      // Remove the 'update:user:features:self' feature to test the case
      await user.addFeatures(testUser, ["update:user:other"]);
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/users/otheruser78`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${newSession.token}`,
          },
          body: JSON.stringify({ features: [], username: "otheruser79" }),
        },
      );

      const resBody = await res.json();
      expect(res.status).toBe(403);
      expect(resBody).toEqual({
        name: "NonEditableUserError",
        message: "Este usuário não pode ser editado por outro usuário.",
        action: "Tente editar o usuário por si mesmo.",
        status_code: 403,
      });
    });

    test("should return NonEditableUserError for other user with 'block:other:update:self' feature 2", async () => {
      await session.expireAllFromUser(testUser);
      const newSession = await session.create(testUser);
      const otherUser = await user.create({
        username: "otheruser79",
        email: "otheruser79@example.com",
        password: "Senha@123",
      }); // Create another user to test against
      await user.addFeatures(otherUser, ["block:other:update:self"]);
      // Remove the 'update:user:features:self' feature to test the case
      await user.addFeatures(testUser, ["update:user:other"]);
      await user.addFeatures(testUser, ["update:user:features:other"]);
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/users/otheruser79`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${newSession.token}`,
          },
          body: JSON.stringify({ features: [], username: "otheruser80" }),
        },
      );

      const resBody = await res.json();
      expect(res.status).toBe(403);
      expect(resBody).toEqual({
        name: "NonEditableUserError",
        message: "Este usuário não pode ser editado por outro usuário.",
        action: "Tente editar o usuário por si mesmo.",
        status_code: 403,
      });
    });

    test("should return NotFoundError for non-existent user", async () => {
      await session.expireAllFromUser(testUser);
      const newSession = await session.create(testUser);

      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/users/nonexistentuser`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${newSession.token}`,
          },
          body: JSON.stringify({ email: "nonexistent@example.com" }),
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

    test("should return PasswordExpiredError if the user's password expired and not trying to updated the password - update self", async () => {
      const expiredUser = await user.expireUserPassword(
        await user.create({
          username: "expiredUser",
          email: "expiredUseremail@example.com",
          password: "Senha@123",
        }),
      );
      const newSession = await session.create(expiredUser);
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/users/${expiredUser.username}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${newSession.token}`,
          },
          body: JSON.stringify({ email: "updated@example.com" }),
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

    test("should return PasswordExpiredError if the user's password expired and not trying to updated the password - update self features", async () => {
      const expiredUser = await user.expireUserPassword(
        await user.create({
          username: "expiredUser3",
          email: "expiredUseremail3@example.com",
          password: "Senha@123",
        }),
      );
      await user.addFeatures(expiredUser, ["update:user:features:self"]);
      const newSession = await session.create(expiredUser);
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/users/${expiredUser.username}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${newSession.token}`,
          },
          body: JSON.stringify({ features: ["create:session"] }),
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

    test("should return PasswordExpiredError if the user's password expired - update other", async () => {
      const expiredUser = await user.expireUserPassword(
        await user.create({
          username: "expiredUser8",
          email: "expiredUseremail8@example.com",
          password: "Senha@123",
        }),
      );

      const otherUser = await user.create({
        username: "otheruser5",
        email: "otheruser5@example.com",
        password: "Senha@123",
      });

      const newSession = await session.create(expiredUser);
      await user.addFeatures(expiredUser, ["update:user:other"]);

      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/users/${otherUser.username}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${newSession.token}`,
          },
          body: JSON.stringify({ password: "oth3rP@ssword" }),
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

    test("should return PasswordExpiredError if the user's password expired - update other feature", async () => {
      const expiredUser = await user.expireUserPassword(
        await user.create({
          username: "expiredUser61",
          email: "expiredUseremail61@example.com",
          password: "Senha@123",
        }),
      );
      await user.addFeatures(expiredUser, ["update:user:features:other"]);
      const otherUser = await user.create({
        username: "otheruser8",
        email: "otheruser8@example.com",
        password: "Senha@123",
      });

      const newSession = await session.create(expiredUser);

      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/users/${otherUser.username}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${newSession.token}`,
          },
          body: JSON.stringify({ features: ["create:session"] }),
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

    test("should return ValidationError when attempting to update self id", async () => {
      await session.expireAllFromUser(testUser);
      const newSession = await session.create(testUser);

      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/users/${testUser.username}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${newSession.token}`,
          },
          body: JSON.stringify({ id: orchestrator.generateRandomUUIDV4() }),
        },
      );

      const resBody = await res.json();
      expect(resBody).toEqual({
        name: "ValidationError",
        message: "Objeto enviado deve ter no mínimo uma chave.",
        action: 'Verifique o campo "body".',
        status_code: 400,
      });
    });

    test("should return ValidationError when attempting to update self password_expires_at", async () => {
      await session.expireAllFromUser(testUser);
      const newSession = await session.create(testUser);

      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/users/${testUser.username}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${newSession.token}`,
          },
          body: JSON.stringify({ password_expires_at: "" }),
        },
      );

      const resBody = await res.json();
      expect(resBody).toEqual({
        name: "ValidationError",
        message: "Objeto enviado deve ter no mínimo uma chave.",
        action: 'Verifique o campo "body".',
        status_code: 400,
      });
    });

    test("should return ValidationError when attempting to update self features with invalid feature", async () => {
      await session.expireAllFromUser(testUser);
      const newSession = await session.create(testUser);
      await user.addFeatures(testUser, ["update:user:features:self"]);

      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/users/${testUser.username}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${newSession.token}`,
          },
          body: JSON.stringify({ features: ["invalid:permission"] }),
        },
      );

      const resBody = await res.json();
      expect(res.status).toBe(400);
      expect(resBody).toEqual({
        name: "ValidationError",
        message: '"invalid:permission" não é uma feature válida.',
        action: 'Verifique o campo "features[0]".',
        status_code: 400,
      });
    });

    test("should return ValidationError when attempting to update another user's email", async () => {
      const otherUser = await user.create({
        username: "otheruser",
        email: "otheruser@example.com",
        password: "Senha@123",
      });

      await session.expireAllFromUser(testUser);
      const newSession = await session.create(testUser);
      await user.addFeatures(testUser, ["update:user:other"]);

      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/users/${otherUser.username}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${newSession.token}`,
          },
          body: JSON.stringify({ email: "updatedother@example.com" }),
        },
      );

      const resBody = await res.json();
      expect(resBody).toEqual({
        name: "ValidationError",
        message: "Objeto enviado deve ter no mínimo uma chave.",
        action:
          "Apenas o campo 'password' pode ser atualizado. Verifique se o objeto enviado possui a chave 'password'.",
        status_code: 400,
      });
    });

    test("should return ValidationError when attempting to update another user without providing data", async () => {
      const otherUser = await user.create({
        username: "otherusernodata",
        email: "otherusernodata@example.com",
        password: "Senha@123",
      });

      await session.expireAllFromUser(testUser);
      const newSession = await session.create(testUser);
      await user.addFeatures(testUser, ["update:user:other"]);

      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/users/${otherUser.username}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${newSession.token}`,
          },
          body: JSON.stringify({}),
        },
      );

      const resBody = await res.json();
      expect(res.status).toBe(400);
      expect(resBody).toEqual({
        name: "ValidationError",
        message: "Objeto enviado deve ter no mínimo uma chave.",
        action: 'Verifique o campo "body".',
        status_code: 400,
      });
    });

    test("should return ValidationError when attempting to update another user's features with invalid feature", async () => {
      const otherUser = await user.create({
        username: "otheruserinvalidfeatures",
        email: "otheruserinvalidfeatures@example.com",
        password: "Senha@123",
      });

      await session.expireAllFromUser(testUser);
      const newSession = await session.create(testUser);
      await user.addFeatures(testUser, ["update:user:features:other"]);

      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/users/${otherUser.username}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${newSession.token}`,
          },
          body: JSON.stringify({ features: ["invalid:permission"] }),
        },
      );

      const resBody = await res.json();
      expect(res.status).toBe(400);
      expect(resBody).toEqual({
        name: "ValidationError",
        message: '"invalid:permission" não é uma feature válida.',
        action: 'Verifique o campo "features[0]".',
        status_code: 400,
      });
    });

    test("should only update username if user has 'update:user:self' but not 'update:user:features:self'", async () => {
      await session.expireAllFromUser(testUser);
      const newSession = await session.create(testUser);
      // Ensure user has self update but not feature update
      await user.addFeatures(testUser, ["update:user:self"]);
      await user.removeFeatures(testUser, ["update:user:features:self"]);
      const originalUser = await user.findOneUser({ id: testUser.id });

      const newUsername = "updatedusername";
      const newFeatures = ["read:session:self"];

      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/users/${originalUser.username}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${newSession.token}`,
          },
          body: JSON.stringify({
            username: newUsername,
            features: newFeatures,
          }),
        },
      );

      const resBody = await res.json();
      expect(res.status).toBe(200);

      const updatedUser = await user.findOneUser({ id: testUser.id });
      expect(updatedUser.username).toBe(newUsername);
      expect(updatedUser.features).toEqual(originalUser.features); // Features should NOT have changed
      expect(updatedUser.updated_at > originalUser.updated_at).toBe(true);
    });

    test("should only update features if user has 'update:user:features:self' but not 'update:user:self'", async () => {
      await session.expireAllFromUser(testUser);
      const newSession = await session.create(testUser);
      // Ensure user has feature update but not self update
      await user.addFeatures(testUser, ["update:user:features:self"]);
      await user.removeFeatures(testUser, ["update:user:self"]);
      const originalUser = await user.findOneUser({ id: testUser.id });

      const newUsername = "anotherupdate";
      const newFeatures = ["read:user:other"];

      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/users/${originalUser.username}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${newSession.token}`,
          },
          body: JSON.stringify({
            username: newUsername,
            features: newFeatures,
          }),
        },
      );

      const resBody = await res.json();
      expect(res.status).toBe(200);

      const updatedUser = await user.findOneUser({ id: testUser.id });
      expect(updatedUser.username).toBe(originalUser.username); // Username should NOT have changed
      expect(updatedUser.features).toEqual(newFeatures);
      expect(updatedUser.updated_at > originalUser.updated_at).toBe(true);
    });

    test("should update both username and features if user has both permissions", async () => {
      await session.expireAllFromUser(testUser);
      const newSession = await session.create(testUser);
      // Ensure user has both permissions
      await user.addFeatures(testUser, [
        "update:user:self",
        "update:user:features:self",
      ]);
      const originalUser = await user.findOneUser({ id: testUser.id });

      const newUsername = "bothupdated";
      const newFeatures = ["read:user:self", "read:user:other"];

      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/users/${originalUser.username}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${newSession.token}`,
          },
          body: JSON.stringify({
            username: newUsername,
            features: newFeatures,
          }),
        },
      );

      const resBody = await res.json();
      expect(res.status).toBe(200);

      const updatedUser = await user.findOneUser({ id: testUser.id });
      expect(updatedUser.username).toBe(newUsername);
      expect(updatedUser.features).toEqual(newFeatures);
      expect(updatedUser.updated_at > originalUser.updated_at).toBe(true);
    });
  });

  describe("Anonymous User", () => {
    test("should return ForbiddenError for unauthorized access", async () => {
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/users/${testUser.username}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email: "anonymous@example.com" }),
        },
      );

      expect(res.status).toBe(403);
      const resBody = await res.json();
      expect(resBody).toEqual({
        name: "ForbiddenError",
        message: "Usuário não pode executar esta operação.",
        action:
          'Verifique se o usuário está logado e possui uma das features "update:user:self", "update:user:other", "update:user:features:self" ou "update:user:features:self".',
        status_code: 403,
      });
    });
  });
});
