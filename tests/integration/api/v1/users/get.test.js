import user from "models/user";
import session from "models/session";
import orchestrator from "tests/orchestrator.js";

describe("GET /api/v1/users", () => {
  let adminUser,
    regularUser,
    targetUserWithFeature,
    targetUserWithoutFeature,
    targetUserWithFeature2;

  beforeAll(async () => {
    await orchestrator.waitForAllServices();
    await orchestrator.clearDatabase();
    await orchestrator.runPendingMigrations();

    // Usuário que fará as requisições com sucesso
    adminUser = await user.create({
      username: "adminUser",
      email: "admin@example.com",
      password: "StrongPassword123@",
    });

    await user.addFeatures(adminUser, ["read:user:other"]);

    // Usuário que fará as requisições sem permissão
    regularUser = await user.create({
      username: "regularUser",
      email: "regular@example.com",
      password: "StrongPassword123@",
    });

    regularUser = await user.update({
      id: regularUser.id,
      password: "StrongPassword123@",
    });

    // Usuário que DEVE ser encontrado na busca
    targetUserWithFeature = await user.create({
      username: "targetWithFeature",
      email: "target-feature@example.com",
      password: "StrongPassword123@",
    });

    targetUserWithFeature = await user.update({
      id: targetUserWithFeature.id,
      password: "StrongPassword123@",
    });

    targetUserWithFeature2 = await user.create({
      username: "targetWithFeature2",
      email: "target-feature2@example.com",
      password: "StrongPassword123@",
    });

    targetUserWithFeature2 = await user.update({
      id: targetUserWithFeature2.id,
      password: "StrongPassword123@",
    });

    await user.addFeatures(targetUserWithFeature, ["nivel:fue:nao:mostrar"]);

    // Usuário que NÃO DEVE ser encontrado na busca
    targetUserWithoutFeature = await user.create({
      username: "targetWithoutFeature",
      email: "target-no-feature@example.com",
      password: "StrongPassword123@",
    });

    targetUserWithoutFeature = await user.update({
      id: targetUserWithoutFeature.id,
      password: "StrongPassword123@",
    });
  });

  describe("Authenticated User with Correct Permissions", () => {
    let adminSession;

    beforeEach(async () => {
      // Garante que a senha do admin não está expirada para os testes de sucesso
      await user.update({ id: adminUser.id, password: "StrongPassword123@" });
      adminSession = await session.create(adminUser);
    });

    it("should return a list (1) of users matching the specified feature", async () => {
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/users?features=nivel:fue:nao:mostrar`,
        {
          method: "GET",
          headers: {
            cookie: `session_id=${adminSession.token}`,
          },
        },
      );

      const resBody = await res.json();

      expect(res.status).toBe(200);
      expect(Array.isArray(resBody)).toBe(true);
      expect(resBody).toHaveLength(1);
      expect(resBody[0].username).toBe(targetUserWithFeature.username);
      expect(resBody[0].id).toBe(targetUserWithFeature.id);
    });

    it("should return a list (2) of users matching the specified feature", async () => {
      await user.addFeatures(targetUserWithFeature2, ["nivel:fue:nao:mostrar"]);
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/users?features=nivel:fue:nao:mostrar`,
        {
          method: "GET",
          headers: {
            cookie: `session_id=${adminSession.token}`,
          },
        },
      );

      const resBody = await res.json();

      expect(res.status).toBe(200);
      expect(Array.isArray(resBody)).toBe(true);
      expect(resBody).toHaveLength(2);
      expect(resBody[0].username).toBe(targetUserWithFeature.username);
      expect(resBody[0].id).toBe(targetUserWithFeature.id);
      expect(resBody[1].username).toBe(targetUserWithFeature2.username);
      expect(resBody[1].id).toBe(targetUserWithFeature2.id);
      await user.removeFeatures(targetUserWithFeature2, [
        "nivel:fue:nao:mostrar",
      ]);
    });

    it("should return a list (2) of users matching a list of features", async () => {
      await user.addFeatures(targetUserWithFeature2, ["nivel:fue:nao:mostrar"]);
      await user.addFeatures(targetUserWithFeature, [
        "nivel:taiko:nao:mostrar",
      ]);
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/users?features=nivel:fue:nao:mostrar&features=nivel:taiko:nao:mostrar`,
        {
          method: "GET",
          headers: {
            cookie: `session_id=${adminSession.token}`,
          },
        },
      );

      const resBody = await res.json();

      expect(res.status).toBe(200);
      expect(Array.isArray(resBody)).toBe(true);
      expect(resBody).toHaveLength(2);
      expect(resBody[1].username).toBe(targetUserWithFeature.username);
      expect(resBody[1].id).toBe(targetUserWithFeature.id);
      expect(resBody[0].username).toBe(targetUserWithFeature2.username);
      expect(resBody[0].id).toBe(targetUserWithFeature2.id);
      await user.removeFeatures(targetUserWithFeature2, [
        "nivel:fue:nao:mostrar",
      ]);
      await user.removeFeatures(targetUserWithFeature, [
        "nivel:taiko:nao:mostrar",
      ]);
    });

    it("should return filtered user data, hiding sensitive information", async () => {
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/users?features=nivel:fue:nao:mostrar`,
        {
          method: "GET",
          headers: {
            cookie: `session_id=${adminSession.token}`,
          },
        },
      );

      const resBody = await res.json();
      const foundUser = resBody[0];

      expect(foundUser.password).toBeUndefined();
      expect(foundUser.email).not.toBe(targetUserWithFeature.email); // Verifica se o e-mail foi ofuscado
    });

    it("should return an empty array if no users have the specified feature", async () => {
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/users?features=nivel:taiko:nao:mostrar`,
        {
          method: "GET",
          headers: {
            cookie: `session_id=${adminSession.token}`,
          },
        },
      );

      const resBody = await res.json();
      expect(res.status).toBe(200);
      expect(resBody).toEqual([]);
    });
  });

  describe("Error Handling and Authorization", () => {
    beforeEach(async () => {
      // Garante que a senha do admin não está expirada para os testes de sucesso
      await user.update({ id: adminUser.id, password: "StrongPassword123@" });
    });
    it("should return 403 ForbiddenError if user does not have 'read:user:other' feature", async () => {
      const regularSession = await session.create(regularUser);
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/users?features=update:user:other`,
        {
          method: "GET",
          headers: {
            cookie: `session_id=${regularSession.token}`,
          },
        },
      );

      expect(res.status).toBe(403);
      const resBody = await res.json();
      expect(resBody.name).toBe("ForbiddenError");
    });

    it("should return 403 PasswordExpiredError if the user's password has expired", async () => {
      await user.expireUserPassword(adminUser);
      const expiredSession = await session.create(adminUser);

      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/users?features=update:user:other`,
        {
          method: "GET",
          headers: {
            cookie: `session_id=${expiredSession.token}`,
          },
        },
      );

      expect(res.status).toBe(403);
      const resBody = await res.json();
      expect(resBody.name).toBe("PasswordExpiredError");
    });

    it("should return 400 ValidationError if 'feature' query param is missing", async () => {
      const adminSession = await session.create(adminUser);
      const res = await fetch(`${orchestrator.webserverUrl}/api/v1/users`, {
        method: "GET",
        headers: {
          cookie: `session_id=${adminSession.token}`,
        },
      });

      expect(res.status).toBe(400);
      const resBody = await res.json();
      expect(resBody.name).toBe("ValidationError");
      expect(resBody.message).toBe('"features" é um campo obrigatório.');
    });

    it("should return 400 ValidationError if 'feature' is not a valid feature", async () => {
      const adminSession = await session.create(adminUser);
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/users?features=invalid:feature:name`,
        {
          method: "GET",
          headers: {
            cookie: `session_id=${adminSession.token}`,
          },
        },
      );

      const resBody = await res.json();
      expect(res.status).toBe(400);

      expect(resBody.name).toBe("ValidationError");
      expect(resBody.message).toBe(
        '"invalid:feature:name" não é uma feature válida.',
      );
    });
  });

  describe("Anonymous User", () => {
    it("should return 403 ForbiddenError for unauthorized access", async () => {
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/users?features=update:user:other`,
        {
          method: "GET",
        },
      );

      expect(res.status).toBe(403);
      const resBody = await res.json();
      expect(resBody.name).toBe("ForbiddenError");
    });
  });
});
