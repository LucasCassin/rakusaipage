import orchestrator from "tests/orchestrator.js";

describe("GET /api/v1/comment-like Endpoint", () => {
  describe("When accessed by an anonymous user", () => {
    test("should return MethodNotAllowedError for an unsupported HTTP method", async () => {
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/comment-like/iasdf`,
        {
          method: "GET",
        },
      );
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
