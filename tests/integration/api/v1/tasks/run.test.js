import orchestrator from "tests/orchestrator.js";
import user from "models/user.js";
import session from "models/session.js";

// 1. LEIA o segredo (NÃO O DEFINA AQUI)
// Você deve rodar o teste assim:
// CRON_SECRET="meu-segredo-de-teste-do-cron" npm run test:integration
const cronSecret = process.env.CRON_SECRET;
if (!cronSecret) {
  throw new Error(
    "CRON_SECRET não definido. Execute o teste com a variável de ambiente.",
  );
}

describe("POST /api/v1/tasks/run", () => {
  let adminUser, regularUser;

  beforeAll(async () => {
    await orchestrator.waitForAllServices();
    await orchestrator.clearDatabase();
    await orchestrator.runPendingMigrations();

    adminUser = await user.findOneUser({ username: "mainUser" });
    adminUser = await user.update({
      id: adminUser.id,
      password: "StrongPassword123@",
    });

    regularUser = await user.create({
      username: "taskRunnerUser",
      email: "taskrunner@test.com",
      password: "StrongPassword123@",
    });
  });

  it("should allow access via Cron Bearer Token", async () => {
    const res = await fetch(`${orchestrator.webserverUrl}/api/v1/tasks/run`, {
      method: "POST",
      headers: {
        // 2. Use a variável lida
        Authorization: `Bearer ${cronSecret}`,
      },
    });
    const resBody = await res.json();

    // O teste agora deve passar, pois o servidor e o teste
    // estão usando o mesmo segredo.
    expect(res.status).toBe(200);
    expect(resBody.message).toContain("Tarefas diárias executadas");
    expect(resBody.summary.overdueUpdated).toBe(0);
  });

  it("should allow access via Admin Cookie", async () => {
    // (Este teste já passava e permanece o mesmo)
    const adminSession = await session.create(adminUser);
    const res = await fetch(`${orchestrator.webserverUrl}/api/v1/tasks/run`, {
      method: "POST",
      headers: {
        cookie: `session_id=${adminSession.token}`,
      },
    });
    expect(res.status).toBe(200);
  });

  it("should return 403 for a Regular User (Cookie)", async () => {
    // (Este teste já passava e permanece o mesmo)
    const regularSession = await session.create(regularUser);
    const res = await fetch(`${orchestrator.webserverUrl}/api/v1/tasks/run`, {
      method: "POST",
      headers: {
        cookie: `session_id=${regularSession.token}`,
      },
    });
    expect(res.status).toBe(403);
  });

  it("should return 401 for an Anonymous User (No auth)", async () => {
    const res = await fetch(`${orchestrator.webserverUrl}/api/v1/tasks/run`, {
      method: "POST",
    });
    // 3. CORREÇÃO: Espera 401 (Unauthorized), não 403
    expect(res.status).toBe(401);
  });

  it("should return 401 for a wrong Bearer Token", async () => {
    const res = await fetch(`${orchestrator.webserverUrl}/api/v1/tasks/run`, {
      method: "POST",
      headers: {
        Authorization: "Bearer token-errado",
      },
    });
    // 4. CORREÇÃO: Espera 401 (Unauthorized), não 403
    expect(res.status).toBe(401);
  });
});
