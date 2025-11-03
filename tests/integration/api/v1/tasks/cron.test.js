import orchestrator from "tests/orchestrator.js";

// Lê o CRON_SECRET (como antes)
const cronSecret = process.env.CRON_SECRET;
if (!cronSecret) {
  throw new Error(
    "CRON_SECRET não definido. Execute o teste com a variável de ambiente.",
  );
}

describe("GET /api/v1/tasks/cron", () => {
  beforeAll(async () => {
    await orchestrator.waitForAllServices();
  });

  it("should allow access with the correct 'Authorization' header", async () => {
    const res = await fetch(
      `${orchestrator.webserverUrl}/api/v1/tasks/cron`, // Rota estática
      {
        method: "GET",
        headers: {
          // --- MUDANÇA AQUI ---
          // Adiciona o cabeçalho 'Authorization' com o prefixo 'Bearer '
          Authorization: `Bearer ${cronSecret}`,
        },
      },
    );
    const resBody = await res.json();
    expect(res.status).toBe(200);
    expect(resBody.message).toContain("via Cron Header");
  });

  it("should return 401 for a wrong Bearer token", async () => {
    const res = await fetch(`${orchestrator.webserverUrl}/api/v1/tasks/cron`, {
      method: "GET",
      headers: {
        Authorization: "Bearer WRONG_SECRET", // Token errado
      },
    });
    expect(res.status).toBe(401);
  });

  it("should return 401 if the header is missing", async () => {
    const res = await fetch(`${orchestrator.webserverUrl}/api/v1/tasks/cron`, {
      method: "GET",
      // Nenhum header de autorização
    });
    expect(res.status).toBe(401);
  });

  it("should return 405 Method Not Allowed for POST", async () => {
    const res = await fetch(`${orchestrator.webserverUrl}/api/v1/tasks/cron`, {
      method: "POST", // Método errado
      headers: {
        Authorization: `Bearer ${cronSecret}`,
      },
    });
    expect(res.status).toBe(405);
  });
});
