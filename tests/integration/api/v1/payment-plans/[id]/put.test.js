import orchestrator from "tests/orchestrator.js";

describe("PUT /api/v1/payment-plans/[id]", () => {
  it("should return 405 Method Not Allowed", async () => {
    const res = await fetch(
      `${orchestrator.webserverUrl}/api/v1/payment-plans/qualquer-coisa`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "should not work" }),
      },
    );
    expect(res.status).toBe(405);
  });
});
