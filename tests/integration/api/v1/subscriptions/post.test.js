import orchestrator from "tests/orchestrator.js";
import user from "models/user.js";
import session from "models/session.js";
import plan from "models/payment_plan.js";
import database from "infra/database.js";

describe("POST /api/v1/subscriptions", () => {
  let adminUser, regularUser, testPlan;

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
      username: "regularSubUser",
      email: "regularsub@test.com",
      password: "StrongPassword123@",
    });
    regularUser = await user.update({
      id: regularUser.id,
      password: "StrongPassword123@",
    });

    testPlan = await plan.create({
      name: "Plano para Assinar",
      full_value: 300,
      period_unit: "month",
      period_value: 1,
    });
  });

  describe("Admin User", () => {
    it("should create a new subscription and the first payment, returning 201", async () => {
      const newSession = await session.create(adminUser);
      const subscriptionData = {
        user_id: regularUser.id,
        plan_id: testPlan.id,
        payment_day: 15,
        start_date: "2025-11-20",
      };

      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/subscriptions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${newSession.token}`,
          },
          body: JSON.stringify(subscriptionData),
        },
      );

      const resBody = await res.json();
      expect(res.status).toBe(201);
      expect(resBody.user_id).toBe(regularUser.id);
      expect(resBody.plan_id).toBe(testPlan.id);

      const paymentsRes = await database.query({
        text: "SELECT * FROM payments WHERE subscription_id = $1",
        values: [resBody.id],
      });
      expect(paymentsRes.rows).toHaveLength(1);
    });

    it("should return 400 for missing 'plan_id'", async () => {
      const newSession = await session.create(adminUser);
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/subscriptions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${newSession.token}`,
          },
          body: JSON.stringify({
            user_id: regularUser.id,
            payment_day: 15,
            start_date: "2025-11-20",
          }),
        },
      );
      expect(res.status).toBe(400);
    });
  });

  describe("Regular User", () => {
    it("should return 403 Forbidden", async () => {
      const newSession = await session.create(regularUser);
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/subscriptions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${newSession.token}`,
          },
          body: JSON.stringify({
            user_id: regularUser.id,
            plan_id: testPlan.id,
            payment_day: 15,
            start_date: "2025-11-20",
          }),
        },
      );
      expect(res.status).toBe(403);
    });
  });

  describe("Anonymous User", () => {
    it("should return 403 Forbidden", async () => {
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/subscriptions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: regularUser.id,
            plan_id: testPlan.id,
            payment_day: 15,
            start_date: "2025-11-20",
          }),
        },
      );
      expect(res.status).toBe(403);
    });
  });
});
