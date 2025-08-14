import orchestrator from "tests/orchestrator.js";

describe("PUT /api/v1/users Endpoint", () => {
  describe("When accessed by an anonymous user", () => {
    test("should return MethodNotAllowedError for an unsupported HTTP method", async () => {
      const res = await fetch(`${orchestrator.webserverUrl}/api/v1/users`, {
        method: "PUT",
      });
      expect(res.status).toBe(405);
      const resBody = await res.json();
      expect(resBody).toEqual({
        name: "MethodNotAllowedError",
        message: "Método não permitido para esta rota.",
        action: "Verifique se o método HTTP está correto para esta rota.",
        status_code: 405,
      });
    });
  });
});
