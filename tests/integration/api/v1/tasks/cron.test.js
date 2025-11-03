import orchestrator from "tests/orchestrator.js";

// Pega o segredo (como antes)
const cronSecret = process.env.CRON_SECRET;
if (!cronSecret) {
  throw new Error(
    "CRON_SECRET não definido. Execute o teste com a variável de ambiente.",
  );
}

describe("POST /api/v1/tasks/cron", () => {
  beforeAll(async () => {
    await orchestrator.waitForAllServices();
  });

  it("should allow access with the correct 'x-vercel-cron-secret' header", async () => {
    const res = await fetch(
      `${orchestrator.webserverUrl}/api/v1/tasks/cron`, // Rota estática
      {
        method: "GET",
        headers: {
          // Adiciona o header que a Vercel injetaria
          "x-vercel-cron-secret": cronSecret,
        },
      },
    );
    const resBody = await res.json();
    expect(res.status).toBe(200);
    expect(resBody.message).toContain("via Cron Header");
  });

  it("should return 403 for a wrong 'x-vercel-cron-secret' header", async () => {
    const res = await fetch(`${orchestrator.webserverUrl}/api/v1/tasks/cron`, {
      method: "GET",
      headers: {
        "x-vercel-cron-secret": "WRONG_SECRET",
      },
    });
    expect(res.status).toBe(403);
  });

  it("should return 403 if the header is missing", async () => {
    const res = await fetch(`${orchestrator.webserverUrl}/api/v1/tasks/cron`, {
      method: "GET",
    });
    expect(res.status).toBe(403);
  });

  it("should return 405 Method Not Allowed for POST", async () => {
    const res = await fetch(`${orchestrator.webserverUrl}/api/v1/tasks/cron`, {
      method: "POST",
      headers: {
        "x-vercel-cron-secret": cronSecret,
      },
    });
    expect(res.status).toBe(405);
  });
});
