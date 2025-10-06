import validator from "models/validator.js";
import { ValidationError } from "errors/index.js";

describe("Validator Model", () => {
  it("should successfully validate an object with a valid schema", () => {
    const object = { username: "validuser" };
    const keys = { username: "required" };

    const result = validator(object, keys);

    expect(result).toEqual({ username: "validuser" });
  });

  it("should throw ValidationError for a short username", () => {
    const object = { username: "a" }; // username muito curto
    const keys = { username: "required" };
    expect(() => validator(object, keys)).toThrow(ValidationError);
    expect(() => validator(object, keys)).toThrow(
      '"username" deve conter no mínimo 3 caracteres.',
    );
  });

  it("should throw ValidationError for a reserved username 'login'", () => {
    const object = { username: "login" }; // username reservado
    const keys = { username: "required" };

    expect(() => validator(object, keys)).toThrow(ValidationError);
    expect(() => validator(object, keys)).toThrow(
      "Este nome de usuário não está disponível para uso.",
    );
  });

  it("should throw ValidationError for a reserved username 'admin'", () => {
    const object = { username: "admin" }; // username reservado
    const keys = { username: "required" };

    expect(() => validator(object, keys)).toThrow(ValidationError);
    expect(() => validator(object, keys)).toThrow(
      "Este nome de usuário não está disponível para uso.",
    );
  });

  it("should throw ValidationError for a username starting with 'favicon'", () => {
    const object = { username: "favicon123" }; // username começando com 'favicon'
    const keys = { username: "required" };

    expect(() => validator(object, keys)).toThrow(ValidationError);
    expect(() => validator(object, keys)).toThrow(
      "Este nome de usuário não está disponível para uso.",
    );
  });

  it("should throw ValidationError for an invalid JSON object", () => {
    const object = undefined; // JSON inválido
    const keys = { username: "required" };

    expect(() => validator(object, keys)).toThrow(ValidationError);
    expect(() => validator(object, keys)).toThrow(
      "Não foi possível interpretar o valor enviado.",
    );
  });

  it("should ignore unknown fields in the object", () => {
    const object = { username: "validuser", extraField: "ignored" };
    const keys = { username: "required" };

    const result = validator(object, keys);

    expect(result).toEqual({ username: "validuser" });
  });

  it("should validate an object with optional fields", () => {
    const object = { username: "validuser" };
    const keys = { username: "optional" };

    const result = validator(object, keys);

    expect(result).toEqual({ username: "validuser" });
  });

  it("should validate an object with optional and required fields", () => {
    const object = { username: "validuser", password: "validPassword@123" };
    const keys = { username: "optional", password: "required" };

    const result = validator(object, keys);
    expect(result).toEqual({
      username: "validuser",
      password: "validPassword@123",
    });
  });

  it("should validate an object with only required fields", () => {
    const object = { password: "validPassword@123" };
    const keys = { username: "optional", password: "required" };

    const result = validator(object, keys);
    expect(result).toEqual({
      password: "validPassword@123",
    });
  });

  it("should throw ValidationError if no required fields are provided and no keys are passed", () => {
    const object = {};
    const keys = { username: "optional" };

    expect(() => validator(object, keys)).toThrow(ValidationError);
    expect(() => validator(object, keys)).toThrow(
      "Objeto enviado deve ter no mínimo uma chave.",
    );
  });

  it("should throw ValidationError if no required fields are provided and no keys are passed (alternative case)", () => {
    const object = { password: "validPassword@123" };
    const keys = { username: "optional" };

    expect(() => validator(object, keys)).toThrow(ValidationError);
    expect(() => validator(object, keys)).toThrow(
      "Objeto enviado deve ter no mínimo uma chave.",
    );
  });

  it("should throw ValidationError for a missing required field", () => {
    const object = {};
    const keys = { username: "required" };

    expect(() => validator(object, keys)).toThrow(ValidationError);
    expect(() => validator(object, keys)).toThrow(
      '"username" é um campo obrigatório.',
    );
  });

  it("should throw ValidationError for a missing required field (alternative case)", () => {
    const object = { username: "validuser", extraField: "ignored" };
    const keys = { username: "required", password: "required" };

    expect(() => validator(object, keys)).toThrow(ValidationError);
    expect(() => validator(object, keys)).toThrow(
      '"password" é um campo obrigatório.',
    );
  });

  describe("Key 'id'", () => {
    it("should correctly validate a valid 'id'", () => {
      const object = { id: "550e8400-e29b-41d4-a716-446655440000" };
      const keys = { id: "required" };

      const result = validator(object, keys);

      expect(result).toEqual({ id: "550e8400-e29b-41d4-a716-446655440000" });
    });

    it("should throw ValidationError for an invalid 'id'", () => {
      const object = { id: "invalid-id" };
      const keys = { id: "required" };

      expect(() => validator(object, keys)).toThrow(ValidationError);
      expect(() => validator(object, keys)).toThrow(
        '"id" deve possuir um token UUID na versão 4.',
      );
    });
  });

  describe("Key 'user_id'", () => {
    it("should correctly validate a valid 'user_id'", () => {
      const object = { user_id: "550e8400-e29b-41d4-a716-446655440000" };
      const keys = { user_id: "required" };

      const result = validator(object, keys);

      expect(result).toEqual({
        user_id: "550e8400-e29b-41d4-a716-446655440000",
      });
    });

    it("should throw ValidationError for an invalid 'user_id'", () => {
      const object = { user_id: "invalid-id" };
      const keys = { user_id: "required" };

      expect(() => validator(object, keys)).toThrow(ValidationError);
      expect(() => validator(object, keys)).toThrow(
        '"user_id" deve possuir um token UUID na versão 4.',
      );
    });
  });

  describe("Key 'email'", () => {
    it("should correctly validate a valid 'email'", () => {
      const object = { email: "user@example.com" };
      const keys = { email: "required" };

      const result = validator(object, keys);

      expect(result).toEqual({ email: "user@example.com" });
    });

    it("should throw ValidationError for an invalid 'email'", () => {
      const object = { email: "invalid-email" };
      const keys = { email: "required" };

      expect(() => validator(object, keys)).toThrow(ValidationError);
      expect(() => validator(object, keys)).toThrow(
        '"email" deve conter um email válido.',
      );
    });
  });

  describe("Key 'password'", () => {
    it("should correctly validate a valid 'password'", () => {
      const object = { password: "validPassword@123" };
      const keys = { password: "required" };

      const result = validator(object, keys);

      expect(result).toEqual({ password: "validPassword@123" });
    });

    it("should throw ValidationError for an invalid 'password'", () => {
      const object = { password: "validPassword123" };
      const keys = { password: "required" };

      expect(() => validator(object, keys)).toThrow(ValidationError);
      expect(() => validator(object, keys)).toThrow(
        '"password" deve conter pelo menos 1 letra maiúscula, 1 letra minúscula, 1 número e 1 caractere especial.',
      );
    });

    it("should throw ValidationError for an invalid 'password'", () => {
      const object = { password: "short" };
      const keys = { password: "required" };

      expect(() => validator(object, keys)).toThrow(ValidationError);
      expect(() => validator(object, keys)).toThrow(
        '"password" deve conter no mínimo 8 caracteres.',
      );
    });
  });

  describe("Key 'features'", () => {
    it("should correctly validate valid 'features'", () => {
      const object = {
        features: [
          "create:user",
          "read:user:self",
          "update:user:self",
          "update:user:other",
          "update:user:features:self",
          "read:migration",
          "create:migration",
          "create:session",
          "read:session:self",
          "read:session:other",
        ],
      };
      const keys = { features: "required" };

      const result = validator(object, keys);

      expect(result).toEqual({
        features: [
          "create:user",
          "read:user:self",
          "update:user:self",
          "update:user:other",
          "update:user:features:self",
          "read:migration",
          "create:migration",
          "create:session",
          "read:session:self",
          "read:session:other",
        ],
      });
    });

    it("should throw ValidationError for invalid 'features'", () => {
      const object = { features: ["invalid-feature"] };
      const keys = { features: "required" };

      expect(() => validator(object, keys)).toThrow(ValidationError);
      expect(() => validator(object, keys)).toThrow(
        '"invalid-feature" não é uma feature válida.',
      );
    });

    it("should throw ValidationError for invalid 'features'", () => {
      const object = { features: "simpleText" };
      const keys = { features: "required" };

      expect(() => validator(object, keys)).toThrow(ValidationError);
      expect(() => validator(object, keys)).toThrow(
        '"features" deve ser do tipo Array.',
      );
    });
  });

  describe("Key 'session_id'", () => {
    it("should correctly validate a valid 'session_id'", () => {
      const object = { session_id: "550e8400-e29b-41d4-a716-446655440000" };
      const keys = { session_id: "required" };

      const result = validator(object, keys);

      expect(result).toEqual({
        session_id: "550e8400-e29b-41d4-a716-446655440000",
      });
    });

    it("should throw ValidationError for an invalid 'session_id'", () => {
      const object = { session_id: "invalid-token" };
      const keys = { session_id: "required" };

      expect(() => validator(object, keys)).toThrow(ValidationError);
      expect(() => validator(object, keys)).toThrow(
        '"session_id" deve possuir um token UUID na versão 4.',
      );
    });
  });

  describe("Key 'token'", () => {
    it("should correctly validate a valid 'token'", () => {
      const object = { token: "a".repeat(96) };
      const keys = { token: "required" };

      const result = validator(object, keys);

      expect(result).toEqual({ token: "a".repeat(96) });
    });

    it("should throw ValidationError for an invalid 'token'", () => {
      const object = { token: "short" };
      const keys = { token: "required" };

      expect(() => validator(object, keys)).toThrow(ValidationError);
      expect(() => validator(object, keys)).toThrow(
        '"token" deve possuir 96 caracteres.',
      );
    });
  });

  describe("Key 'created_at'", () => {
    it("should correctly validate a valid 'created_at'", () => {
      const object = { created_at: "2019-09-21T00:00:00.000Z" };
      const keys = { created_at: "required" };

      const result = validator(object, keys);

      expect(result).toEqual({
        created_at: new Date("2019-09-21T00:00:00.000Z"),
      });
    });

    it("should throw ValidationError for an invalid 'created_at'", () => {
      const object = { created_at: "invalid-date" };
      const keys = { created_at: "required" };

      expect(() => validator(object, keys)).toThrow(ValidationError);
      expect(() => validator(object, keys)).toThrow(
        '"created_at" deve conter uma data válida.',
      );
    });
  });

  describe("Key 'updated_at'", () => {
    it("should correctly validate a valid 'updated_at'", () => {
      const object = { updated_at: "2019-09-21T00:00:00.000Z" };
      const keys = { updated_at: "required" };

      const result = validator(object, keys);

      expect(result).toEqual({
        updated_at: new Date("2019-09-21T00:00:00.000Z"),
      });
    });

    it("should throw ValidationError for an invalid 'updated_at'", () => {
      const object = { updated_at: "invalid-date" };
      const keys = { updated_at: "required" };

      expect(() => validator(object, keys)).toThrow(ValidationError);
      expect(() => validator(object, keys)).toThrow(
        '"updated_at" deve conter uma data válida.',
      );
    });
  });

  describe("Key 'expires_at'", () => {
    it("should correctly validate a valid 'expires_at'", () => {
      const object = { expires_at: "2019-09-21T00:00:00.000Z" };
      const keys = { expires_at: "required" };

      const result = validator(object, keys);

      expect(result).toEqual({
        expires_at: new Date("2019-09-21T00:00:00.000Z"),
      });
    });

    it("should throw ValidationError for an invalid 'expires_at'", () => {
      const object = { expires_at: "invalid-date" };
      const keys = { expires_at: "required" };

      expect(() => validator(object, keys)).toThrow(ValidationError);
      expect(() => validator(object, keys)).toThrow(
        '"expires_at" deve conter uma data válida.',
      );
    });
  });

  describe("Key 'user'", () => {
    it("should correctly validate a valid 'user'", () => {
      const object = {
        id: "550e8400-e29b-41d4-a716-446655440000",
        username: "validuser",
        created_at: "2019-09-21T00:00:00.000Z",
        updated_at: "2024-09-06T00:00:00.000Z",
        features: ["create:user", "read:user:self"],
      };
      const keys = { user: "required" };

      const result = validator(object, keys);

      expect(result).toEqual({
        id: "550e8400-e29b-41d4-a716-446655440000",
        username: "validuser",
        created_at: new Date("2019-09-21T00:00:00.000Z"),
        updated_at: new Date("2024-09-06T00:00:00.000Z"),
        features: ["create:user", "read:user:self"],
      });
    });

    it("should throw ValidationError for an invalid 'user'", () => {
      const object = {
        id: "invalid-id",
        username: "a",
        created_at: "invalid-date",
        updated_at: "invalid-date",
        features: ["invalid-feature"],
      };
      const keys = { user: "required" };

      expect(() => validator(object, keys)).toThrow(ValidationError);
      expect(() => validator(object, keys)).toThrow(
        '"id" deve possuir um token UUID na versão 4.',
      );
    });
  });

  describe("Key 'content' (for comments)", () => {
    it("should correctly validate valid 'content'", () => {
      const object = { content: "Este é um comentário válido." };
      const keys = { content: "required" };
      const result = validator(object, keys);
      expect(result).toEqual(object);
    });

    it("should throw ValidationError for empty 'content'", () => {
      const object = { content: " " }; // Conteúdo vazio
      const keys = { content: "required" };
      expect(() => validator(object, keys)).toThrow(ValidationError);
      expect(() => validator(object, keys)).toThrow(
        '"content" não pode estar em branco.',
      );
    });

    it("should throw ValidationError for 'content' exceeding max length", () => {
      const object = { content: "a".repeat(2001) }; // Conteúdo muito longo
      const keys = { content: "required" };
      expect(() => validator(object, keys)).toThrow(ValidationError);
      expect(() => validator(object, keys)).toThrow(
        '"content" deve conter no máximo 2000 caracteres.',
      );
    });
  });

  describe("Key 'video_id'", () => {
    it("should correctly validate a valid 'video_id'", () => {
      const object = { video_id: "dQw4w9WgXcQ" };
      const keys = { video_id: "required" };
      const result = validator(object, keys);
      expect(result).toEqual(object);
    });

    it("should throw ValidationError for an empty 'video_id'", () => {
      const object = { video_id: "" };
      const keys = { video_id: "required" };
      expect(() => validator(object, keys)).toThrow(ValidationError);
    });
  });

  describe("Key 'parent_id'", () => {
    it("should correctly validate a valid 'parent_id' (UUID)", () => {
      const object = { parent_id: "550e8400-e29b-41d4-a716-446655440000" };
      const keys = { parent_id: "optional" };
      const result = validator(object, keys);
      expect(result).toEqual(object);
    });

    it("should allow 'parent_id' to be null", () => {
      const object = { parent_id: null };
      const keys = { parent_id: "optional" };
      const result = validator(object, keys);
      expect(result).toEqual(object);
    });

    it("should throw ValidationError for an invalid 'parent_id'", () => {
      const object = { parent_id: "invalid-uuid" };
      const keys = { parent_id: "optional" };
      expect(() => validator(object, keys)).toThrow(ValidationError);
    });
  });

  describe("Key 'comment_id'", () => {
    it("should correctly validate a valid 'comment_id'", () => {
      const object = { comment_id: "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d" };
      const keys = { comment_id: "required" };
      const result = validator(object, keys);
      expect(result).toEqual(object);
    });

    it("should throw ValidationError for an invalid 'comment_id'", () => {
      const object = { comment_id: "not-a-uuid" };
      const keys = { comment_id: "required" };
      expect(() => validator(object, keys)).toThrow(ValidationError);
    });
  });
});
