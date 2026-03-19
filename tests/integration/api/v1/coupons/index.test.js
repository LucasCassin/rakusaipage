import orchestrator from "tests/orchestrator.js";
import user from "models/user.js";
import session from "models/session.js";
import coupon from "models/coupon.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("API V1 Coupons", () => {
  let adminUser, adminToken;

  beforeAll(async () => {
    adminUser = await user.findOneUser({ username: "mainUser" });
    await user.update({
      id: adminUser.id,
      password: "StrongPassword123@",
    });

    adminUser = await user.addFeatures(adminUser, ["shop:coupons:manage"]);

    const sessionObj = await session.create(adminUser);
    adminToken = sessionObj.token;
  });

  describe("POST /api/v1/coupons", () => {
    test("should create a new coupon with valid data", async () => {
      const response = await fetch(
        `${orchestrator.webserverUrl}/api/v1/coupons`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${adminToken}`,
          },
          body: JSON.stringify({
            code: "TESTE20",
            description: "Desconto de 20%",
            discount_percentage: 20,
            type: "subtotal",
          }),
        },
      );

      const responseBody = await response.json();
      expect(response.status).toBe(201);
      expect(responseBody.code).toBe("TESTE20");
      expect(responseBody.discount_percentage).toBe(20);
      expect(responseBody.type).toBe("subtotal");
      expect(responseBody.id).toBeDefined();
    });

    test("should return 403 if user does not have permission", async () => {
      const commonUser = await user.create({
        username: "commonCoupon",
        email: "commoncoupon@test.com",
        password: "StrongPassword123@",
      });
      await user.update({
        id: commonUser.id,
        password: "StrongPassword123@",
      });
      const commonSession = await session.create(commonUser);

      const response = await fetch(
        `${orchestrator.webserverUrl}/api/v1/coupons`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${commonSession.token}`,
          },
          body: JSON.stringify({
            code: "HACKER",
            description: "...",
            discount_percentage: 100,
          }),
        },
      );

      expect(response.status).toBe(403);
    });

    test("should return 400 if required fields are missing", async () => {
      const response = await fetch(
        `${orchestrator.webserverUrl}/api/v1/coupons`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${adminToken}`,
          },
          body: JSON.stringify({
            description: "Sem código",
          }),
        },
      );

      expect(response.status).toBe(400);
    });
  });

  describe("GET /api/v1/coupons", () => {
    beforeAll(async () => {
      // Create a few more coupons to test list
      await coupon.create({
        code: "LIST1",
        description: "List 1",
        discount_percentage: 5,
      });
      await coupon.create({
        code: "LIST2",
        description: "List 2",
        discount_percentage: 10,
      });
    });

    test("should list coupons with pagination", async () => {
      const response = await fetch(
        `${orchestrator.webserverUrl}/api/v1/coupons?limit=5`,
        {
          method: "GET",
          headers: {
            cookie: `session_id=${adminToken}`,
          },
        },
      );

      const responseBody = await response.json();
      expect(response.status).toBe(200);
      expect(Array.isArray(responseBody.coupons)).toBe(true);
      // We created TESTE20, LIST1, LIST2. So at least 3.
      expect(responseBody.coupons.length).toBeGreaterThanOrEqual(3);
      expect(responseBody.count).toBeGreaterThanOrEqual(3);
    });

    test("should return 403 if user does not have permission", async () => {
      const commonUser = await user.findOneUser({ username: "commonCoupon" });
      const commonSession = await session.create(commonUser);

      const response = await fetch(
        `${orchestrator.webserverUrl}/api/v1/coupons`,
        {
          method: "GET",
          headers: {
            cookie: `session_id=${commonSession.token}`,
          },
        },
      );

      expect(response.status).toBe(403);
    });
  });
});
