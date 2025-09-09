import user from "models/user.js";
import authentication from "models/authentication";
import { version as uuidVersion } from "uuid";
import orchestrator from "tests/orchestrator.js";
import { ValidationError, UnauthorizedError } from "errors/index.js";

describe("User Model", () => {
  beforeAll(async () => {
    await orchestrator.waitForAllServices(); // Espera todos os serviços estarem disponíveis
    await orchestrator.clearDatabase(); // Limpa o banco de dados antes de executar os testes
    await orchestrator.runPendingMigrations(); // Roda as migrações antes de executar os testes
  });

  afterAll(async () => {
    await orchestrator.clearTable("users"); // Limpa a tabela após os testes
  });

  describe("create", () => {
    it("should create a user with valid data", async () => {
      const userData = {
        username: "testuser1",
        email: "testuser@example.com",
        password: "Senha@123",
      };

      const result = await user.create(userData);
      expect(result).toEqual({
        id: result.id,
        username: "testuser1",
        email: "testuser@example.com",
        password: result.password,
        features: user.DEFAULT_FEATURES,
        password_expires_at: result.password_expires_at,
        created_at: result.created_at,
        updated_at: result.updated_at,
      });
      expect(uuidVersion(result.id)).toBe(4);
      expect(Date.parse(result.created_at)).not.toBeNaN();
      expect(Date.parse(result.updated_at)).not.toBeNaN();
      expect(Date.parse(result.password_expires_at)).not.toBeNaN();
      // expect(Date.parse(result.password_expires_at)).toBeGreaterThan(
      //   Date.parse(result.updated_at) + 89 * 24 * 60 * 60 * 1000,
      // );
      expect(Date.parse(result.password_expires_at)).toBeLessThan(
        Date.parse(result.updated_at),
      );
      expect(result.password).not.toBe("Senha@123");

      await expect(
        authentication.comparePassword("Senha@123", result.password),
      ).resolves.not.toThrow();

      await expect(
        authentication.comparePassword("senhaErrada", result.password),
      ).rejects.toThrow(UnauthorizedError);

      await expect(
        authentication.comparePassword("senhaErrada", result.password),
      ).rejects.toThrow(
        expect.objectContaining({
          message: "A senha informada não confere com a senha do usuário.",
          action:
            "Verifique se a senha informada está correta e tente novamente.",
        }),
      );
    });

    it("should throw ValidationError if the username already exists", async () => {
      const newUserData = {
        username: "testuser2",
        email: "newemail@example.com",
        password: "Senha@123",
      };
      await user.create(newUserData);

      const userData = {
        username: "testuser2",
        email: "otheremail@example.com",
        password: "Senha@123",
      };
      await expect(user.create(userData)).rejects.toThrow(ValidationError);
      await expect(user.create(userData)).rejects.toThrow(
        expect.objectContaining({
          message: "O 'username' informado já está sendo usado.",
          action: "Por favor, escolha outro 'username' e tente novamente.",
        }),
      );
    });

    it("should throw ValidationError if the username already exists (case insensitive)", async () => {
      const newUserData = {
        username: "testuser3",
        email: "newemail2@example.com",
        password: "Senha@123",
      };
      await user.create(newUserData);

      const userData = {
        username: "testUser3",
        email: "otheremail2@example.com",
        password: "Senha@123",
      };
      await expect(user.create(userData)).rejects.toThrow(ValidationError);
      await expect(user.create(userData)).rejects.toThrow(
        expect.objectContaining({
          message: "O 'username' informado já está sendo usado.",
          action: "Por favor, escolha outro 'username' e tente novamente.",
        }),
      );
    });

    it("should throw ValidationError if the email already exists", async () => {
      const newUserData = {
        username: "testuser4",
        email: "email@example.com",
        password: "Senha@123",
      };
      await user.create(newUserData);

      const userData = {
        username: "newtestuser",
        email: "email@example.com",
        password: "Senha@123",
      };
      await expect(user.create(userData)).rejects.toThrow(ValidationError);
      await expect(user.create(userData)).rejects.toThrow(
        expect.objectContaining({
          message: "O email informado já está sendo usado.",
          action: "Por favor, escolha outro email e tente novamente.",
        }),
      );
    });
  });

  describe("createAnonymous", () => {
    it("should return an anonymous user with default permissions", () => {
      const result = user.createAnonymous();
      expect(result).toEqual({
        features: [/*"create:user", */ "create:session"],
      });
    });
  });

  describe("update", () => {
    it("should update user data successfully", async () => {
      const userData = {
        username: "testuser5",
        email: "testuser5@example.com",
        password: "Senha@123",
      };

      const resultNewUser = await user.create(userData);
      const userObjetToUpdate = {
        id: resultNewUser.id,
        username: "updateduser",
        email: "updateduser@example.com",
      };

      const result = await user.update(userObjetToUpdate);

      expect(result).toEqual(
        expect.objectContaining({
          username: "updateduser",
          email: "updateduser@example.com",
        }),
      );
      expect(Date.parse(result.created_at)).not.toBeNaN();
      expect(Date.parse(result.updated_at)).not.toBeNaN();
      expect(result.updated_at > result.created_at).toBe(true);
    });
    it("should update user password successfully", async () => {
      const userData = {
        username: "testuser51",
        email: "testuser51@example.com",
        password: "Senha@123",
      };

      const resultNewUser = await user.create(userData);
      const userObjetToUpdate = {
        id: resultNewUser.id,
        password: "NovaSenha@123",
        extraField: "updateduser@example.com",
      };

      const result = await user.update(userObjetToUpdate);
      expect(result).toEqual(
        expect.objectContaining({
          username: userData.username,
          email: userData.email,
        }),
      );
      expect(Date.parse(result.created_at)).not.toBeNaN();
      expect(Date.parse(result.updated_at)).not.toBeNaN();
      expect(result.updated_at > result.created_at).toBe(true);
      expect(Date.parse(result.password_expires_at)).toBeGreaterThan(
        Date.parse(result.updated_at) + 89 * 24 * 60 * 60 * 1000,
      );
      expect(
        result.password_expires_at > resultNewUser.password_expires_at,
      ).toBe(true);

      await expect(
        authentication.comparePassword("NovaSenha@123", result.password),
      ).resolves.not.toThrow();

      await expect(
        authentication.comparePassword("Senha@123", result.password),
      ).rejects.toThrow(UnauthorizedError);
    });
    it("should throw ValidationError if the username already exists", async () => {
      await user.create({
        username: "updateduser2",
        email: "testEmailUserValidation1@email.com",
        password: "Senha@123",
      });

      const userData = {
        username: "testuser6",
        email: "testuser6@example.com",
        password: "Senha@123",
      };

      const resultNewUser = await user.create(userData);
      const userObjetToUpdate = {
        id: resultNewUser.id,
        username: "updateduser2",
        email: "updateduser@example.com",
      };

      await expect(user.update(userObjetToUpdate)).rejects.toThrow(
        ValidationError,
      );
      await expect(user.update(userObjetToUpdate)).rejects.toThrow(
        expect.objectContaining({
          message: "O 'username' informado já está sendo usado.",
          action: "Por favor, escolha outro 'username' e tente novamente.",
        }),
      );
    });
    it("should throw ValidationError if the email already exists", async () => {
      await user.create({
        username: "updateduser3",
        email: "testEmailUserValidation2@email.com",
        password: "Senha@123",
      });

      const userData = {
        username: "testuser7",
        email: "testuser7@example.com",
        password: "Senha@123",
      };

      const resultNewUser = await user.create(userData);
      const userObjetToUpdate = {
        id: resultNewUser.id,
        username: "updateduser4",
        email: "testEmailUserValidation2@email.com",
      };

      await expect(user.update(userObjetToUpdate)).rejects.toThrow(
        ValidationError,
      );
      await expect(user.update(userObjetToUpdate)).rejects.toThrow(
        expect.objectContaining({
          message: "O email informado já está sendo usado.",
          action: "Por favor, escolha outro email e tente novamente.",
        }),
      );
    });
  });

  describe("removeFeatures", () => {
    it("should remove features from the user", async () => {
      const userData = {
        username: "testuser8",
        email: "testuser8@example.com",
        password: "Senha@123",
      };

      const newUser = await user.create(userData);

      const result = await user.removeFeatures(newUser, ["create:session"]);
      expect(result.features).not.toContain("create:session");
    });
  });

  describe("addFeatures", () => {
    it("should add features to the user", async () => {
      const userData = {
        username: "testuser9",
        email: "testuser9@example.com",
        password: "Senha@123",
      };

      const newUser = await user.create(userData);

      const result = await user.addFeatures(newUser, [
        "update:user:features:self",
      ]);
      expect(result.features).toContain("update:user:features:self");
    });
    it("should not add duplicate features", async () => {
      const userData = {
        username: "testuser10",
        email: "testuser10@example.com",
        password: "Senha@123",
      };

      const newUser = await user.create(userData);

      const result = await user.addFeatures(newUser, ["create:session"]);
      expect(result.features).toEqual(
        expect.arrayContaining(user.DEFAULT_FEATURES),
      );
    });
  });

  describe("findOneUser", () => {
    it("should return a user by ID", async () => {
      const userData = {
        username: "testuser11",
        email: "testuser11@example.com",
        password: "Senha@123",
      };

      const newUser = await user.create(userData);
      const userObject = { id: newUser.id };

      const result = await user.findOneUser(userObject);

      expect(result).toEqual(newUser);
    });

    it("should return a user by email", async () => {
      const userData = {
        username: "testuser12",
        email: "testuser12@example.com",
        password: "Senha@123",
      };

      const newUser = await user.create(userData);
      const userObject = { email: newUser.email };

      const result = await user.findOneUser(userObject);

      expect(result).toEqual(newUser);
    });
    it("should return a user by username", async () => {
      const userData = {
        username: "testuser13",
        email: "testuser13@example.com",
        password: "Senha@123",
      };

      const newUser = await user.create(userData);
      const userObject = { username: newUser.username };

      const result = await user.findOneUser(userObject);

      expect(result).toEqual(newUser);
    });
  });

  describe("expireUserPassword", () => {
    it("should expire the user password", async () => {
      const userData = {
        username: "testuser14",
        email: "emailtestuser14@example.com",
        password: "Senha@123",
      };

      const newUser = await user.create(userData);
      const expiredUser = await user.expireUserPassword(newUser);
      expect(Date.parse(expiredUser.password_expires_at)).toEqual(
        Date.parse(expiredUser.created_at) - 1 * 24 * 60 * 60 * 1000,
      );
    });
  });

  describe("updateFeatures", () => {
    let createdUser;

    beforeAll(async () => {
      // Cria um usuário para os testes
      createdUser = await user.create({
        username: "testuserupdatefeatures",
        email: "testuserupdatefeatures@example.com",
        password: "Senha@123",
      });
    });
    it("should update the user's features successfully", async () => {
      const newFeatures = ["read:user:other", "update:user:other"];

      const updatedUser = await user.updateFeatures(createdUser, newFeatures);
      expect(updatedUser.features).toEqual(newFeatures);
      expect(updatedUser.features.length).toBe(newFeatures.length);
      expect(Date.parse(updatedUser.updated_at)).not.toBeNaN();
      expect(updatedUser.updated_at > createdUser.updated_at).toBe(true);
    });

    it("should replace the user's features with the new ones", async () => {
      const newFeatures = ["read:session:self", "create:session"];

      const updatedUser = await user.updateFeatures(createdUser, newFeatures);

      expect(updatedUser.features).toEqual(newFeatures);
      expect(updatedUser.features.length).toBe(newFeatures.length);
      expect(updatedUser.features).not.toContain("read:user:other");
      expect(updatedUser.features).not.toContain("update:user:other");
    });

    it("should throw ValidationError if the features do not exist", async () => {
      const newFeatures = ["not:exist", "not:exist2"];

      await expect(
        user.updateFeatures(createdUser, newFeatures),
      ).rejects.toThrow(
        expect.objectContaining({
          name: "ValidationError",
          message: '"not:exist" não é uma feature válida.',
        }),
      );
    });

    it("should remove all features if no features are provided", async () => {
      const updatedUser = await user.updateFeatures(createdUser, []);

      expect(updatedUser.features).toEqual([]);
      expect(updatedUser.features.length).toBe(0);
      expect(Date.parse(updatedUser.updated_at)).not.toBeNaN();
      expect(updatedUser.updated_at > createdUser.updated_at).toBe(true);
    });

    it("should throw ValidationError if the user ID is missing", async () => {
      const newFeatures = ["read:user:other", "update:user:other"];

      await expect(user.updateFeatures({}, newFeatures)).rejects.toThrow(
        expect.objectContaining({
          name: "ValidationError",
          message: '"id" é um campo obrigatório.',
        }),
      );
    });

    it("should throw ValidationError if the user does not exist", async () => {
      const nonExistentUser = { id: orchestrator.generateRandomUUIDV4() };
      const newFeatures = ["read:user:other", "update:user:other"];
      await expect(
        user.updateFeatures(nonExistentUser, newFeatures),
      ).rejects.toThrow(
        expect.objectContaining({
          name: "NotFoundError",
          message: "Usuário não encontrado.",
        }),
      );
    });
  });
});
