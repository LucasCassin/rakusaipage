import session from "models/session.js";
import user from "models/user.js";
import { ValidationSessionError, NotFoundError } from "errors/index.js";
import orchestrator from "tests/orchestrator.js";

describe("Session Model", () => {
  let createdUser;

  beforeAll(async () => {
    await orchestrator.waitForAllServices(); // Espera todos os serviços estarem disponíveis
    await orchestrator.clearDatabase(); // Limpa o banco de dados antes de executar os testes
    await orchestrator.runPendingMigrations(); // Roda as migrações antes de executar os testes
    createdUser = await user.create({
      username: "testuser",
      email: "testuser@example.com",
      password: "Password123!",
    });
  });

  afterAll(async () => {
    await orchestrator.clearTable("users"); // Limpa a tabela após os testes
    await orchestrator.clearTable("sessions"); // Limpa a tabela após os testes
  });

  it("should create a new session successfully", async () => {
    const newSession = await session.create(createdUser);
    expect(newSession.user_id).toBe(createdUser.id);
    expect(newSession.token).toBeDefined();
    expect(newSession.token.length).toBe(96);
    expect(Date.parse(newSession.created_at)).not.toBeNaN();
    expect(Date.parse(newSession.updated_at)).not.toBeNaN();
    expect(Date.parse(newSession.expires_at)).not.toBeNaN();
    expect(newSession.expires_at > new Date()).toBe(true);
    expect(newSession.expires_at > newSession.updated_at).toBe(true);
    expect(
      newSession.expires_at <
        new Date(new Date().getTime() + 1000 * 60 * 60 * 24),
    ).toBe(true);
    expect(newSession.created_at).toEqual(newSession.updated_at);
  });

  it("should set the session token cookie in the response", async () => {
    const newSession = await session.create(createdUser);
    const response = { setHeader: jest.fn() };

    const sessionObject = { token: newSession.token };
    session.setSessionTokenInCookieResponse(sessionObject, response);

    expect(response.setHeader).toHaveBeenCalledTimes(1);
    expect(response.setHeader).toHaveBeenCalledWith(
      "Set-Cookie",
      expect.arrayContaining([
        expect.stringContaining(`session_id=${newSession.token}`),
      ]),
    );
  });

  it("should clear the session ID cookie in the response", () => {
    const response = { setHeader: jest.fn() };

    session.clearSessionIdCookie(response);

    expect(response.setHeader).toHaveBeenCalledTimes(1);
    expect(response.setHeader).toHaveBeenCalledWith(
      "Set-Cookie",
      expect.arrayContaining([expect.stringContaining("session_id=invalid")]),
    );
  });

  it("should renew a session successfully", async () => {
    const newSession = await session.create(createdUser);
    const response = { setHeader: jest.fn() };

    const renewedSession = await session.renew(newSession, response);
    expect(renewedSession.session_id).toBe(newSession.session_id);
    expect(renewedSession.expires_at > newSession.expires_at).toBe(true);
  });

  it("should find a valid session from the request", async () => {
    const newSession = await session.create(createdUser);
    const request = { cookies: { session_id: newSession.token } };

    const foundSession = await session.findOneValidFromRequest(request);
    expect(foundSession).toEqual(newSession);
  });

  it("should throw ValidationSessionError if the session token is missing in the request", async () => {
    const request = { cookies: {} };

    await expect(() =>
      session.findOneValidFromRequest(request),
    ).rejects.toThrowError(
      new ValidationSessionError({
        message: "Usuário não possui sessão ativa.",
        action: "Verifique se este usuário está logado.",
      }),
    );
  });

  it("should throw ValidationSessionError if the session is expired", async () => {
    const newSession = await session.create(createdUser);
    await session.expire(newSession);
    const request = { cookies: { session_id: newSession.token } };

    await expect(() =>
      session.findOneValidFromRequest(request),
    ).rejects.toThrowError(
      new ValidationSessionError({
        message: "Usuário não possui sessão ativa.",
        action: "Verifique se este usuário está logado.",
      }),
    );
  });

  it("should expire a session successfully", async () => {
    const newSession = await session.create(createdUser);

    const expiredSession = await session.expire(newSession);
    expect(expiredSession.expires_at < new Date()).toBe(true);
    expect(expiredSession.expires_at < expiredSession.created_at).toBe(true);
  });

  it("should expire all sessions for a user", async () => {
    await session.expireAllFromUser(createdUser);
    await session.create(createdUser);
    await session.create(createdUser);

    const expiredSessions = await session.expireAllFromUser(createdUser);

    expect(expiredSessions.length).toBe(2);
    expiredSessions.forEach((s) => {
      expect(s.expires_at < new Date()).toBe(true);
    });
  });

  it("should throw NotFoundError if the user is not found", async () => {
    await expect(() =>
      session.expireAllFromUser({
        id: orchestrator.generateRandomUUIDV4(),
      }),
    ).rejects.toThrowError(
      new NotFoundError({
        message: "Usuário não encontrado.",
        action: "Verifique se este usuário existe e tente novamente.",
      }),
    );
  });
});
