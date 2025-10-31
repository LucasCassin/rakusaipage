import orchestrator from "tests/orchestrator.js";

// 1. LEIA o segredo (NÃO O DEFINA AQUI)
// Você deve rodar o teste assim:
// CRON_SECRET="meu-segredo-de-teste-do-cron" npm run test:integration
const cronSecret = process.env.CRON_SECRET;
if (!cronSecret) {
  throw new Error(
    "CRON_SECRET não definido. Execute o teste com a variável de ambiente.",
  );
}

describe("POST /api/v1/tasks/cron/[secret]", () => {
  beforeAll(async () => {
    await orchestrator.waitForAllServices();
  });

  it("should allow access with the correct Cron Secret", async () => {
    const res = await fetch(
      `${orchestrator.webserverUrl}/api/v1/tasks/cron/${cronSecret}`,
      {
        method: "POST",
      },
    );
    const resBody = await res.json();

    expect(res.status).toBe(200);
    expect(resBody.message).toContain("via Cron");
    expect(resBody.summary.overdueUpdated).toBeDefined();
  });

  it("should return 403 for a wrong Cron Secret", async () => {
    const res = await fetch(
      `${orchestrator.webserverUrl}/api/v1/tasks/cron/WRONG_SECRET`,
      {
        method: "POST",
      },
    );

    // 403 (Forbidden) como definimos na rota
    expect(res.status).toBe(403);
  });

  it("should return 404 for a missing Cron Secret (rota não encontrada)", async () => {
    const res = await fetch(
      `${orchestrator.webserverUrl}/api/v1/tasks/cron/`, // URL incompleta
      {
        method: "POST",
      },
    );
    // 404 (Not Found) porque a rota não foi encontrada sem o [secret]
    expect(res.status).toBe(404);
  });

  it("should return 405 Method Not Allowed for GET", async () => {
    const res = await fetch(
      `${orchestrator.webserverUrl}/api/v1/tasks/cron/${cronSecret}`,
      {
        method: "GET",
      },
    );
    expect(res.status).toBe(405);
  });
});
