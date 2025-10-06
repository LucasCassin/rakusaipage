import authentication from "models/authentication.js";
import session from "models/session.js";
import user from "models/user.js";
import { UnauthorizedError } from "errors/index.js";
import orchestrator from "tests/orchestrator.js";

describe("Authentication Model Tests", () => {
  let createdUser;

  beforeAll(async () => {
    // Clear database and prepare test environment
    await orchestrator.waitForAllServices();
    await orchestrator.clearDatabase();
    await orchestrator.runPendingMigrations();

    // Create a test user
    createdUser = await user.create({
      username: "testuser",
      email: "testuser@example.com",
      password: "Senha!123",
    });
    createdUser = await user.update({
      id: createdUser.id,
      password: "Senha@123",
    });
  });

  afterAll(async () => {
    // Clean up database after tests
    await orchestrator.clearTable("users");
    await orchestrator.clearTable("sessions");
  });

  describe("hashPassword Function", () => {
    it("should generate a hashed password for the provided plain text password", async () => {
      const plainPassword = "senha123";
      const hashedPassword = await authentication.hashPassword(plainPassword);

      expect(hashedPassword).not.toBe(plainPassword);
      expect(hashedPassword).toMatch(/^\$2[aby]\$.{56}$/);
    });
  });

  describe("comparePassword Function", () => {
    it("should resolve without error if the plain password matches the hash", async () => {
      const plainPassword = "senha123";
      const hashedPassword = await authentication.hashPassword(plainPassword);

      await expect(
        authentication.comparePassword(plainPassword, hashedPassword),
      ).resolves.not.toThrow();
    });

    it("should throw UnauthorizedError if the plain password does not match the hash", async () => {
      const plainPassword = "senha123";
      const hashedPassword = await authentication.hashPassword(plainPassword);

      await expect(
        authentication.comparePassword("wrongPassword", hashedPassword),
      ).rejects.toThrow(UnauthorizedError);

      await expect(
        authentication.comparePassword("wrongPassword", hashedPassword),
      ).rejects.toThrow(
        expect.objectContaining({
          message: "A senha informada não confere com a senha do usuário.",
          action:
            "Verifique se a senha informada está correta e tente novamente.",
        }),
      );
    });
  });

  describe("injectAnonymousOrUser Middleware", () => {
    it("should inject an authenticated user into the request context if session_id is valid", async () => {
      const sessionObject = await session.create(createdUser);
      const mockRequest = {
        cookies: { session_id: sessionObject.token },
        context: {},
      };
      const mockResponse = {};
      const mockNext = jest.fn();

      await authentication.injectAnonymousOrUser(
        mockRequest,
        mockResponse,
        mockNext,
      );

      expect(mockRequest.context.user).toMatchObject({
        id: createdUser.id,
        username: createdUser.username,
        email: createdUser.email,
      });
      expect(mockRequest.context.session).toMatchObject(sessionObject);
      expect(mockNext).toHaveBeenCalled();
    });

    it("should inject an anonymous user into the request context if session_id is missing", async () => {
      const mockRequest = { cookies: {}, context: {} };
      const mockResponse = {};
      const mockNext = jest.fn();

      await authentication.injectAnonymousOrUser(
        mockRequest,
        mockResponse,
        mockNext,
      );

      expect(mockRequest.context.user).toMatchObject({
        features: [/*"create:user",*/ "create:session"],
      });
      expect(mockNext).toHaveBeenCalled();
    });

    it("should throw ValidationSessionError if the session token is invalid", async () => {
      const mockRequest = {
        cookies: { session_id: orchestrator.generateRandomToken() },
        context: {},
      };
      const mockResponse = {};
      const mockNext = jest.fn();

      await expect(
        authentication.injectAnonymousOrUser(
          mockRequest,
          mockResponse,
          mockNext,
        ),
      ).rejects.toThrow(
        expect.objectContaining({
          name: "ValidationSessionError",
          message: "Usuário não possui sessão ativa.",
          action: "Verifique se este usuário está logado.",
        }),
      );
    });

    it("should throw ValidationSessionError if the session token is expired", async () => {
      const sessionObject = await session.create(createdUser);
      await session.expireAllFromUser(createdUser);
      const mockRequest = {
        cookies: { session_id: sessionObject.token },
        context: {},
      };
      const mockResponse = {};
      const mockNext = jest.fn();

      await expect(
        authentication.injectAnonymousOrUser(
          mockRequest,
          mockResponse,
          mockNext,
        ),
      ).rejects.toThrow(
        expect.objectContaining({
          name: "ValidationSessionError",
          message: "Usuário não possui sessão ativa.",
          action: "Verifique se este usuário está logado.",
        }),
      );
    });

    it("should throw ValidationSessionError if the user does not exist", async () => {
      const sessionObject = await session.create({
        id: orchestrator.generateRandomUUIDV4(),
      });
      const mockRequest = {
        cookies: { session_id: sessionObject.token },
        context: {},
      };
      const mockResponse = {};
      const mockNext = jest.fn();

      await expect(
        authentication.injectAnonymousOrUser(
          mockRequest,
          mockResponse,
          mockNext,
        ),
      ).rejects.toThrow(
        expect.objectContaining({
          name: "ValidationSessionError",
          message: "Usuário não encontrado.",
          action: "Verifique se este usuário existe e tente novamente.",
        }),
      );
    });

    it("should throw ForbiddenError if the user lacks the 'read:session:self' feature", async () => {
      const sessionObject = await session.create(createdUser);
      await user.removeFeatures(createdUser, ["read:session:self"]);
      const mockRequest = {
        cookies: { session_id: sessionObject.token },
        context: {},
      };
      const mockResponse = {};
      const mockNext = jest.fn();

      await expect(
        authentication.injectAnonymousOrUser(
          mockRequest,
          mockResponse,
          mockNext,
        ),
      ).rejects.toThrow(
        expect.objectContaining({
          name: "ForbiddenError",
          message: "Você não possui permissão para executar esta ação.",
          action:
            'Verifique se este usuário possui a feature "read:session:self" ou se a sessão realmente é do usuário ativo.',
        }),
      );
    });
  });

  describe("createSessionAndSetCookies Function", () => {
    it("should create a session and set cookies in the response", async () => {
      const mockResponse = {
        setHeader: jest.fn(),
      };

      const sessionObject = await authentication.createSessionAndSetCookies(
        createdUser,
        mockResponse,
      );

      expect(sessionObject).toMatchObject({
        user_id: createdUser.id,
        token: expect.any(String),
      });
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        "Set-Cookie",
        expect.arrayContaining([expect.stringContaining("session_id=")]),
      );
    });
  });

  describe("checkIfUserPasswordExpired Middleware", () => {
    it("should allow the request if the user's password has not expired", async () => {
      const mockRequest = {
        context: {
          user: createdUser,
        },
      };
      const mockResponse = {};
      const mockNext = jest.fn();

      await expect(() =>
        authentication.checkIfUserPasswordExpired(
          mockRequest,
          mockResponse,
          mockNext,
        ),
      ).not.toThrow();

      expect(mockNext).toHaveBeenCalled();
    });

    it("should throw PasswordExpiredError if the user's password has expired", async () => {
      const newUser = await user.create({
        username: "expireduser",
        email: "expireduseremail@example.com",
        password: "Senha!123",
      });
      const expiredUser = await user.expireUserPassword(newUser);

      const mockRequest = {
        context: {
          user: expiredUser,
        },
      };
      const mockResponse = {};
      const mockNext = jest.fn();

      await expect(() =>
        authentication.checkIfUserPasswordExpired(
          mockRequest,
          mockResponse,
          mockNext,
        ),
      ).toThrow(
        expect.objectContaining({
          name: "PasswordExpiredError",
          message: "A sua senha expirou.",
          action: "Atualize sua senha para continuar com o acesso.",
        }),
      );

      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should not throw an error if no user is present in the request context", async () => {
      const mockRequest = {
        context: {},
      };
      const mockResponse = {};
      const mockNext = jest.fn();

      await expect(() =>
        authentication.checkIfUserPasswordExpired(
          mockRequest,
          mockResponse,
          mockNext,
        ),
      ).not.toThrow();

      expect(mockNext).toHaveBeenCalled();
    });
  });
});
