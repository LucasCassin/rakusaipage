import orchestrator from "tests/orchestrator.js";
import user from "models/user.js";
import session from "models/session.js";

describe("POST /api/v1/tasks/admin-run", () => {
  let adminUser, regularUser;

  beforeAll(async () => {
    await orchestrator.waitForAllServices();
    await orchestrator.clearDatabase();
    await orchestrator.runPendingMigrations();

    // Cria admin (que já tem a feature 'create:migration' por padrão)
    adminUser = await user.findOneUser({ username: "mainUser" });
    adminUser = await user.update({
      id: adminUser.id,
      password: "StrongPassword123@",
    });

    // Cria usuário regular (sem a feature)
    regularUser = await user.create({
      username: "taskRunnerUser",
      email: "taskrunner@test.com",
      password: "StrongPassword123@",
    });
  });

  it("should allow access via Admin Cookie", async () => {
    const adminSession = await session.create(adminUser);
    const res = await fetch(
      `${orchestrator.webserverUrl}/api/v1/tasks/admin-run`,
      {
        method: "POST",
        headers: {
          cookie: `session_id=${adminSession.token}`,
        },
      },
    );
    const resBody = await res.json();

    expect(res.status).toBe(200);
    expect(resBody.message).toContain("via Admin");
  });

  it("should return 403 for a Regular User (Cookie)", async () => {
    const regularSession = await session.create(regularUser);
    const res = await fetch(
      `${orchestrator.webserverUrl}/api/v1/tasks/admin-run`,
      {
        method: "POST",
        headers: {
          cookie: `session_id=${regularSession.token}`,
        },
      },
    );
    // 403 (Forbidden) porque o usuário está logado, mas não tem permissão
    expect(res.status).toBe(403);
  });

  it("should return 401 for an Anonymous User (No auth)", async () => {
    const res = await fetch(
      `${orchestrator.webserverUrl}/api/v1/tasks/admin-run`,
      {
        method: "POST",
      },
    );
    // 401 (Unauthorized) porque o usuário anônimo injetado não tem ID
    expect(res.status).toBe(401);
  });

  it("should return 405 Method Not Allowed for GET", async () => {
    const res = await fetch(
      `${orchestrator.webserverUrl}/api/v1/tasks/admin-run`,
      {
        method: "GET",
      },
    );
    expect(res.status).toBe(405);
  });
});
