import orchestrator from "tests/orchestrator.js";

describe("PUT /api/v1/subscriptions", () => {
  it("should return 405 Method Not Allowed for POST", async () => {
    const res = await fetch(
      `${orchestrator.webserverUrl}/api/v1/financials_kpi`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ test: "fail" }),
      },
    );
    expect(res.status).toBe(405);
  });
});
