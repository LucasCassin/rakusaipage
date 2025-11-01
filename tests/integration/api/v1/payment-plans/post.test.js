import orchestrator from "tests/orchestrator.js";
import user from "models/user.js";
import session from "models/session.js";

describe("POST /api/v1/payment-plans", () => {
  let adminUser, regularUser;

  beforeAll(async () => {
    await orchestrator.waitForAllServices();
    await orchestrator.clearDatabase();
    await orchestrator.runPendingMigrations();
    adminUser = await user.findOneUser({ username: "mainUser" });
    regularUser = await user.create({
      username: "regularPlanUser",
      email: "regularplan@test.com",
      password: "StrongPassword123@",
    });
    regularUser = await user.update({
      id: regularUser.id,
      password: "StrongPassword123@",
    });
    adminUser = await user.update({
      id: adminUser.id,
      password: "StrongPassword123@",
    });
  });

  describe("Admin User", () => {
    it("should create a new payment plan with valid data and return 201", async () => {
      const newSession = await session.create(adminUser);
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/payment-plans`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${newSession.token}`,
          },
          body: JSON.stringify({
            name: "Plano Anual de Taiko",
            full_value: 1500.0,
            period_unit: "year",
            period_value: 1,
          }),
        },
      );
      const resBody = await res.json();
      expect(res.status).toBe(201);
      expect(resBody.name).toBe("Plano Anual de Taiko");
    });

    it("should return 400 for missing required fields", async () => {
      const newSession = await session.create(adminUser);
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/payment-plans`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${newSession.token}`,
          },
          body: JSON.stringify({ name: "Plano Incompleto" }),
        },
      );
      expect(res.status).toBe(400);
    });
  });

  describe("Regular User", () => {
    it("should return 403 Forbidden", async () => {
      const newSession = await session.create(regularUser);
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/payment-plans`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${newSession.token}`,
          },
          body: JSON.stringify({
            name: "Tentativa Inválida",
            full_value: 100,
            period_unit: "month",
            period_value: 1,
          }),
        },
      );
      expect(res.status).toBe(403);
    });
  });
});
