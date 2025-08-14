import orchestrator from "tests/orchestrator.js";

describe("GET /api/v1/status Endpoint", () => {
  describe("Anonymous User", () => {
    test("should retrieve the current system status successfully", async () => {
      const res = await fetch(`${orchestrator.webserverUrl}/api/v1/status`);
      const resBody = await res.json();
      expect(res.status).toBe(200);

      const parseDate = new Date(resBody.updated_at).toISOString();
      expect(resBody.updated_at).toEqual(parseDate);

      expect(resBody.dependencies.database.version).toBe("17.4");
      expect(resBody.dependencies.database.max_connections).toBe(100);
      expect(resBody.dependencies.database.opened_connections).toBe(1);
    });
  });
});
