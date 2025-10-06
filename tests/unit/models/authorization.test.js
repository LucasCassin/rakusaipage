import authorization from "models/authorization.js";
import { ForbiddenError, ValidationError } from "errors/index.js";

describe("Authorization Model", () => {
  describe("Function can", () => {
    it("should return true for a user with the feature and valid resource", () => {
      const user = { id: "123", features: ["read:user:self"] };
      const feature = "read:user:self";
      const resource = { id: "123" };

      const result = authorization.can(user, feature, resource);

      expect(result).toBe(true);
    });

    it("should return false for a user without the feature", () => {
      const user = { id: "123", features: [] };
      const feature = "read:user:self";
      const resource = { id: "123" };

      const result = authorization.can(user, feature, resource);

      expect(result).toBe(false);
    });

    it("should return false for an invalid resource", () => {
      const user = { id: "123", features: ["read:user:self"] };
      const feature = "read:user:self";
      const resource = { id: "456" };

      const result = authorization.can(user, feature, resource);

      expect(result).toBe(false);
    });

    it("should throw ValidationError for an invalid user", () => {
      const user = null;
      const feature = "read:user:self";
      const resource = { id: "123" };

      expect(() => authorization.can(user, feature, resource)).toThrow(
        ValidationError,
      );
      expect(() => authorization.can(user, feature, resource)).toThrow(
        'Nenhum "user" foi especificado para a ação de autorização.',
      );
    });

    it("should throw ValidationError for an invalid feature", () => {
      const user = { id: "123", features: ["read:user:self"] };
      const feature = null;
      const resource = { id: "123" };

      expect(() => authorization.can(user, feature, resource)).toThrow(
        ValidationError,
      );
      expect(() => authorization.can(user, feature, resource)).toThrow(
        'Nenhuma "feature" foi especificada para a ação de autorização.',
      );
    });

    it("should throw ValidationError for a non-available feature", () => {
      const user = { id: "123", features: ["read:user:self"] };
      const feature = "other:feature";
      const resource = { id: "123" };

      expect(() => authorization.can(user, feature, resource)).toThrow(
        ValidationError,
      );
      expect(() => authorization.can(user, feature, resource)).toThrow(
        "A feature utilizada não está disponível na lista de features existentes.",
      );
    });

    it("should return true for a user with 'update:self:comment' on their own comment", () => {
      const user = { id: "user123", features: ["update:self:comment"] };
      const feature = "update:self:comment";
      const resource = { user_id: "user123" };
      const result = authorization.can(user, feature, resource);
      expect(result).toBe(true);
    });

    it("should return false for a user with 'update:self:comment' on another user's comment", () => {
      const user = { id: "user123", features: ["update:self:comment"] };
      const feature = "update:self:comment";
      const resource = { user_id: "user456" };
      const result = authorization.can(user, feature, resource);
      expect(result).toBe(false);
    });

    it("should return true for a user with 'update:other:comment' on any comment", () => {
      const user = { id: "user123", features: ["update:other:comment"] };
      const feature = "update:other:comment";
      const result = authorization.can(user, feature); // Não precisa de 'resource' para 'other'
      expect(result).toBe(true);
    });
  });

  describe("Function canRequest", () => {
    it("should allow the request for a user with the feature", () => {
      const user = { features: ["read:user:self"] };
      const request = { context: { user } };
      const response = {};
      const next = jest.fn();

      const middleware = authorization.canRequest("read:user:self");
      middleware(request, response, next);

      expect(next).toHaveBeenCalled();
    });

    it("should throw ForbiddenError for a user without the feature", () => {
      const user = { features: [] };
      const request = { context: { user } };
      const response = {};
      const next = jest.fn();

      const middleware = authorization.canRequest("read:user:self");

      expect(() => middleware(request, response, next)).toThrow(ForbiddenError);
      expect(() => middleware(request, response, next)).toThrow(
        "Usuário não pode executar esta operação.",
      );
    });
  });

  describe("Function filterInput", () => {
    it("should correctly filter input fields for the 'create:user' feature", () => {
      const user = { features: ["create:user"] };
      const feature = "create:user";
      const input = {
        username: "validuser",
        email: "user@example.com",
        password: "ValidPassword@123",
        extraField: "ignored",
      };

      const result = authorization.filterInput(user, feature, input);

      expect(result).toEqual({
        username: "validuser",
        email: "user@example.com",
        password: "ValidPassword@123",
      });
    });

    it("should throw ValidationError for an invalid user", () => {
      const user = null;
      const feature = "create:user";
      const input = { username: "validuser" };

      expect(() => authorization.filterInput(user, feature, input)).toThrow(
        ValidationError,
      );
      expect(() => authorization.filterInput(user, feature, input)).toThrow(
        'Nenhum "user" foi especificado para a ação de autorização.',
      );
    });

    it("should throw ValidationError for an invalid feature", () => {
      const user = { features: ["create:user"] };
      const feature = null;
      const input = { username: "validuser" };

      expect(() => authorization.filterInput(user, feature, input)).toThrow(
        ValidationError,
      );
      expect(() => authorization.filterInput(user, feature, input)).toThrow(
        'Nenhuma "feature" foi especificada para a ação de autorização.',
      );
    });

    it("should throw ValidationError for invalid input", () => {
      const user = { features: ["create:user"] };
      const feature = "create:user";
      const input = null;

      expect(() => authorization.filterInput(user, feature, input)).toThrow(
        ValidationError,
      );
      expect(() => authorization.filterInput(user, feature, input)).toThrow(
        'Nenhum "input" foi especificado para a ação de filtro.',
      );
    });

    it("should correctly filter input fields for the 'read:user:self' feature", () => {
      const user = { features: ["read:user:self"], id: "123" };
      const feature = "read:user:self";
      const input = { username: "validuser", extraField: "ignored" };
      const target = { id: "123" };

      const result = authorization.filterInput(user, feature, input, target);

      expect(result).toEqual({ username: "validuser" });
    });

    it("should correctly filter input fields for the 'update:user:self' feature", () => {
      const user = { features: ["update:user:self"], id: "123" };
      const feature = "update:user:self";
      const input = {
        email: "user@example.com",
        password: "ValidPassword@123",
        username: "validuser",
        extraField: "ignored",
      };
      const target = { id: "123" };

      const result = authorization.filterInput(user, feature, input, target);

      expect(result).toEqual({
        email: "user@example.com",
        username: "validuser",
      });
    });

    it("should correctly filter input fields for the 'update:user:password:self' feature", () => {
      const user = { features: ["update:user:password:self"], id: "123" };
      const feature = "update:user:password:self";
      const input = {
        email: "user@example.com",
        password: "ValidPassword@123",
        username: "validuser",
        extraField: "ignored",
      };
      const target = { id: "123" };

      const result = authorization.filterInput(user, feature, input, target);

      expect(result).toEqual({
        password: "ValidPassword@123",
      });
    });

    it("should correctly filter input fields for the 'update:user:features:self' feature", () => {
      const user = { features: ["update:user:features:self"], id: "123" };
      const feature = "update:user:features:self";
      const input = { features: ["read:user:self"], extraField: "ignored" };
      const target = { id: "123" };

      const result = authorization.filterInput(user, feature, input, target);

      expect(result).toEqual({ features: ["read:user:self"] });
    });

    it("should correctly filter input fields for the 'create:session' feature", () => {
      const user = { features: ["create:session"] };
      const feature = "create:session";
      const input = {
        email: "user@example.com",
        password: "ValidPassword@123",
        extraField: "ignored",
      };

      const result = authorization.filterInput(user, feature, input);

      expect(result).toEqual({
        email: "user@example.com",
        password: "ValidPassword@123",
      });
    });

    it("should correctly filter input fields for the 'read:session:self' feature", () => {
      const user = { features: ["read:session:self"], id: "123" };
      const feature = "read:session:self";
      const input = { session_id: "session123", extraField: "ignored" };
      const target = { user_id: "123" };

      const result = authorization.filterInput(user, feature, input, target);

      expect(result).toEqual({ session_id: "session123" });
    });

    it("should correctly filter input fields for the 'read:session:other' feature", () => {
      const user = { features: ["read:session:other"] };
      const feature = "read:session:other";
      const input = { session_id: "session123", extraField: "ignored" };

      const result = authorization.filterInput(user, feature, input);

      expect(result).toEqual({ session_id: "session123" });
    });

    it("should correctly filter input for 'create:comment'", () => {
      const user = { features: ["create:comment"] };
      const input = {
        content: "novo comentário",
        video_id: "vid1",
        parent_id: null,
        extra: "ignorado",
      };
      const result = authorization.filterInput(user, "create:comment", input);
      expect(result).toEqual({
        content: "novo comentário",
        video_id: "vid1",
        parent_id: null,
      });
    });

    it("should correctly filter input for 'read:comment'", () => {
      const user = { features: ["read:comment"] };
      const input = { video_id: "vid1", extra: "ignorado" };
      const result = authorization.filterInput(user, "read:comment", input);
      expect(result).toEqual({ video_id: "vid1" });
    });

    it("should correctly filter input for 'like:comment'", () => {
      const user = { features: ["like:comment"] };
      const input = { comment_id: "cid1", extra: "ignorado" };
      const result = authorization.filterInput(user, "like:comment", input);
      expect(result).toEqual({ comment_id: "cid1" });
    });

    it("should correctly filter input for 'unlike:comment'", () => {
      const user = { features: ["unlike:comment"] };
      const input = { comment_id: "cid1", extra: "ignorado" };
      const result = authorization.filterInput(user, "unlike:comment", input);
      expect(result).toEqual({ comment_id: "cid1" });
    });

    it("should correctly filter input for 'update:self:comment'", () => {
      const user = { id: "user123", features: ["update:self:comment"] };
      const target = { user_id: "user123" }; // O recurso alvo pertence ao usuário
      const input = {
        comment_id: "cid1",
        content: "texto atualizado",
        video_id: "ignorado",
      };
      const result = authorization.filterInput(
        user,
        "update:self:comment",
        input,
        target,
      );
      expect(result).toEqual({
        comment_id: "cid1",
        content: "texto atualizado",
      });
    });

    it("should correctly filter input for 'delete:other:comment'", () => {
      const user = { features: ["delete:other:comment"] };
      const input = { comment_id: "cid1", content: "ignorado" };
      const result = authorization.filterInput(
        user,
        "delete:other:comment",
        input,
      );
      expect(result).toEqual({ comment_id: "cid1" });
    });
  });

  describe("Function filterOutput", () => {
    it("should throw ValidationError for an invalid user", () => {
      const user = null;
      const feature = "read:user:self";
      const output = { id: "123" };

      expect(() => authorization.filterOutput(user, feature, output)).toThrow(
        ValidationError,
      );
      expect(() => authorization.filterOutput(user, feature, output)).toThrow(
        'Nenhum "user" foi especificado para a ação de autorização.',
      );
    });

    it("should throw ValidationError for an invalid feature", () => {
      const user = { id: "123", features: ["read:user:self"] };
      const feature = null;
      const output = { id: "123" };

      expect(() => authorization.filterOutput(user, feature, output)).toThrow(
        ValidationError,
      );
      expect(() => authorization.filterOutput(user, feature, output)).toThrow(
        'Nenhuma "feature" foi especificada para a ação de autorização.',
      );
    });

    it("should throw ValidationError for invalid output", () => {
      const user = { id: "123", features: ["read:user:self"] };
      const feature = "read:user:self";
      const output = null;

      expect(() => authorization.filterOutput(user, feature, output)).toThrow(
        ValidationError,
      );
      expect(() => authorization.filterOutput(user, feature, output)).toThrow(
        'Nenhum "output" foi especificado para a ação de filtro.',
      );
    });

    it("should correctly filter output fields for the 'read:user:self' feature", () => {
      const user = { features: ["read:user:self"], id: "123" };
      const feature = "read:user:self";
      const output = {
        id: "123",
        username: "validuser",
        email: "user@example.com",
        password: "ValidPassword@123",
        features: ["read:user:self"],
        created_at: "2019-09-21T00:00:00.000Z",
        updated_at: "2024-09-06T00:00:00.000Z",
        extraField: "ignored",
      };

      const result = authorization.filterOutput(user, feature, output);

      expect(result).toEqual({
        id: "123",
        username: "validuser",
        email: "u**r@example.com",
        features: ["read:user:self"],
        created_at: "2019-09-21T00:00:00.000Z",
        updated_at: "2024-09-06T00:00:00.000Z",
      });
    });

    it("should correctly filter output fields for the 'read:user:other' feature", () => {
      const user = { features: ["read:user:other"] };
      const feature = "read:user:other";
      const output = {
        id: "456",
        username: "otheruser",
        email: "validEmail@email.com",
        password: "ValidPassword@123",
        features: ["read:user:other"],
        created_at: "2019-09-21T00:00:00.000Z",
        updated_at: "2024-09-06T00:00:00.000Z",
        extraField: "ignored",
      };

      const result = authorization.filterOutput(user, feature, output);

      expect(result).toEqual({
        id: "456",
        username: "otheruser",
        features: ["read:user:other"],
        created_at: "2019-09-21T00:00:00.000Z",
        updated_at: "2024-09-06T00:00:00.000Z",
      });
    });

    it("should correctly filter output fields for the 'update:user:self' feature", () => {
      const user = { features: ["update:user:self"], id: "123" };
      const feature = "update:user:self";
      const output = {
        id: "123",
        username: "validuser",
        email: "user@example.com",
        password: "ValidPassword@123",
        features: ["update:user:self"],
        created_at: "2019-09-21T00:00:00.000Z",
        updated_at: "2024-09-06T00:00:00.000Z",
        extraField: "ignored",
      };

      const result = authorization.filterOutput(user, feature, output);

      expect(result).toEqual({
        id: "123",
        username: "validuser",
        email: "u**r@example.com",
        features: ["update:user:self"],
        created_at: "2019-09-21T00:00:00.000Z",
        updated_at: "2024-09-06T00:00:00.000Z",
      });
    });

    it("should correctly filter output fields for the 'update:user:features:self' feature", () => {
      const user = { features: ["update:user:features:self"], id: "123" };
      const feature = "update:user:features:self";
      const output = {
        id: "123",
        features: ["read:user:self"],
        extraField: "ignored",
      };

      const result = authorization.filterOutput(user, feature, output);

      expect(result).toEqual({ features: ["read:user:self"] });
    });

    it("should correctly filter output fields for the 'create:session' feature", () => {
      const user = { features: ["create:session"], id: "123" };
      const feature = "create:session";
      const output = {
        session_id: "session123",
        token: "token123",
        expires_at: "2019-09-21T00:00:00.000Z",
        created_at: "2019-09-21T00:00:00.000Z",
        updated_at: "2024-09-06T00:00:00.000Z",
        user_id: "123",
        extraField: "ignored",
      };

      const result = authorization.filterOutput(user, feature, output);

      expect(result).toEqual({
        session_id: "session123",
        token: "token123",
        expires_at: "2019-09-21T00:00:00.000Z",
        created_at: "2019-09-21T00:00:00.000Z",
        updated_at: "2024-09-06T00:00:00.000Z",
      });
    });

    it("should correctly filter output fields for the 'read:session:self' feature", () => {
      const user = { features: ["read:session:self"], id: "123" };
      const feature = "read:session:self";
      const output = {
        session_id: "session123",
        token: "validToken",
        expires_at: "2019-09-21T00:00:00.000Z",
        created_at: "2019-09-21T00:00:00.000Z",
        updated_at: "2024-09-06T00:00:00.000Z",
        user_id: "123",
        extraField: "ignored",
      };

      const result = authorization.filterOutput(user, feature, output);

      expect(result).toEqual({
        session_id: "session123",
        token: "validToken",
        expires_at: "2019-09-21T00:00:00.000Z",
        created_at: "2019-09-21T00:00:00.000Z",
        updated_at: "2024-09-06T00:00:00.000Z",
      });
    });

    it("should correctly filter output fields for the 'read:session:other' feature", () => {
      const user = { features: ["read:session:other"], id: "123" };
      const feature = "read:session:other";
      const output = {
        session_id: "session123",
        token: "validToken",
        expires_at: "2019-09-21T00:00:00.000Z",
        created_at: "2019-09-21T00:00:00.000Z",
        updated_at: "2024-09-06T00:00:00.000Z",
        user_id: "432",
        extraField: "ignored",
      };

      const result = authorization.filterOutput(user, feature, output);

      expect(result).toEqual({
        session_id: "session123",
        expires_at: "2019-09-21T00:00:00.000Z",
        created_at: "2019-09-21T00:00:00.000Z",
        updated_at: "2024-09-06T00:00:00.000Z",
      });
    });

    it("should correctly filter output for 'update:self:comment'", () => {
      const user = { id: "user123", features: ["update:self:comment"] };
      const output = {
        id: "cid1",
        user_id: "user123",
        content: "texto atualizado",
        secret: "não deve aparecer",
      };
      const result = authorization.filterOutput(
        user,
        "update:self:comment",
        output,
      );
      expect(result).not.toHaveProperty("secret");
      expect(result).toHaveProperty("id", "cid1");
    });

    it("should return empty object if user tries to filter output for someone else's comment with a 'self' feature", () => {
      const user = { id: "user123", features: ["delete:self:comment"] };
      const output = { id: "cid1", user_id: "user456" }; // Recurso de outro usuário
      const result = authorization.filterOutput(
        user,
        "delete:self:comment",
        output,
      );
      expect(result).toEqual({});
    });

    it("should correctly filter output for 'create:comment'", () => {
      const user = { features: ["create:comment"] };
      const output = {
        id: "cid1",
        content: "texto",
        user_id: "uid1",
        username: "testuser",
        likes_count: "5",
        password: "secret_password", // Campo sensível que deve ser removido
      };
      const result = authorization.filterOutput(user, "create:comment", output);
      expect(result).toEqual({
        id: "cid1",
        content: "texto",
        user_id: "uid1",
        username: "testuser",
        likes_count: "5",
      });
      expect(result).not.toHaveProperty("password");
    });

    it("should correctly filter output for 'read:comment'", () => {
      const user = { features: ["read:comment"] };
      const output = {
        id: "cid1",
        content: "texto",
        user_id: "uid1",
        username: "testuser",
        likes_count: "5",
        password: "secret_password", // Campo sensível que deve ser removido
      };
      const result = authorization.filterOutput(user, "read:comment", output);
      expect(result).toEqual({
        id: "cid1",
        content: "texto",
        user_id: "uid1",
        username: "testuser",
        likes_count: "5",
      });
      expect(result).not.toHaveProperty("password");
    });

    it("should correctly filter output for 'like:comment'", () => {
      const user = { features: ["like:comment"] };
      const output = { comment_id: "cid1", user_id: "uid1" };
      const result = authorization.filterOutput(user, "like:comment", output);
      expect(result).toEqual({ comment_id: "cid1" });
    });

    it("should correctly filter output for 'unlike:comment'", () => {
      const user = { features: ["unlike:comment"] };
      const output = { comment_id: "cid1" };
      const result = authorization.filterOutput(user, "unlike:comment", output);
      expect(result).toEqual({ comment_id: "cid1" });
    });

    it("should correctly filter output for 'delete:other:comment'", () => {
      const user = { features: ["delete:other:comment"] };
      const output = { id: "cid1", user_id: "any_user_id" };
      const result = authorization.filterOutput(
        user,
        "delete:other:comment",
        output,
      );
      expect(result).toEqual({ id: "cid1" });
    });
  });
});
