import tokenModel from "models/token";
import database from "infra/database";
import userModel from "models/user";

beforeAll(async () => {
  await database.query("DELETE FROM tokens;");
  await database.query("DELETE FROM users;");
});

describe("Token Model", () => {
  let createdUser;

  beforeAll(async () => {
    // Cria um usuário para os testes
    createdUser = await userModel.create({
      username: "tokentestuser",
      email: "tokentest@example.com",
      password: "validPassword123@",
    });
  });

  test("Deve criar um token de reset de senha válido", async () => {
    const token = await tokenModel.create({
      userId: createdUser.id,
      type: tokenModel.TYPES.PASSWORD_RESET,
    });

    expect(token).toHaveProperty("id");
    expect(token).toHaveProperty("token");
    expect(token.user_id).toBe(createdUser.id);
    expect(token.used).toBe(false);
  });

  test("Deve encontrar um token válido", async () => {
    const newToken = await tokenModel.create({
      userId: createdUser.id,
      type: tokenModel.TYPES.PASSWORD_RESET,
    });
    const foundToken = await tokenModel.findValidToken(
      newToken.token,
      tokenModel.TYPES.PASSWORD_RESET,
    );
    expect(foundToken).toEqual(newToken);
  });

  test("Não deve encontrar token se ele estiver expirado", async () => {
    // Cria token que expirou há 1 minuto
    const expiredToken = await tokenModel.create({
      userId: createdUser.id,
      type: tokenModel.TYPES.PASSWORD_RESET,
      expiresInMinutes: -1,
    });

    const foundToken = await tokenModel.findValidToken(
      expiredToken.token,
      tokenModel.TYPES.PASSWORD_RESET,
    );
    expect(foundToken).toBeNull();
  });

  test("Não deve encontrar token se ele já foi usado", async () => {
    const token = await tokenModel.create({
      userId: createdUser.id,
      type: tokenModel.TYPES.PASSWORD_RESET,
    });

    await tokenModel.markAsUsed(token.id);

    const foundToken = await tokenModel.findValidToken(
      token.token,
      tokenModel.TYPES.PASSWORD_RESET,
    );
    expect(foundToken).toBeNull();
  });

  test("Deve detectar requisição recente (Rate Limit)", async () => {
    // Cria um token agora
    await tokenModel.create({
      userId: createdUser.id,
      type: tokenModel.TYPES.PASSWORD_RESET,
    });

    // Verifica se houve requisição nos últimos 5 minutos
    const hasRecent = await tokenModel.hasRecentRequest(
      createdUser.id,
      tokenModel.TYPES.PASSWORD_RESET,
      5,
    );
    expect(hasRecent).toBe(true);
  });
});
