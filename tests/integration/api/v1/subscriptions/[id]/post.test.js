import orchestrator from "tests/orchestrator.js";

describe("POST /api/v1/subscriptions/[id]", () => {
  it("should return 405 Method Not Allowed", async () => {
    const randomId = orchestrator.generateRandomUUIDV4();
    const res = await fetch(
      `${orchestrator.webserverUrl}/api/v1/subscriptions/${randomId}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "should not work" }),
      },
    );
    expect(res.status).toBe(405);
  });
});
