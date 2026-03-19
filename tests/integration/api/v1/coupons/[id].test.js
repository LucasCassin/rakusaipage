import orchestrator from "tests/orchestrator.js";
import user from "models/user.js";
import session from "models/session.js";
import coupon from "models/coupon.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("API V1 Coupons [id]", () => {
  let adminUser, adminToken, couponToUpdate;

  beforeAll(async () => {
    // Create Admin
    adminUser = await user.findOneUser({ username: "mainUser" });
    // Atualiza senha para não expirar
    await user.update({ id: adminUser.id, password: "StrongPassword123@" });

    adminUser = await user.addFeatures(adminUser, ["shop:coupons:manage"]);
    const sessionObj = await session.create(adminUser);
    adminToken = sessionObj.token;
  });

  beforeEach(async () => {
    // Cria um cupom novo antes de cada teste para garantir isolamento
    couponToUpdate = await coupon.create({
      code: `UPDATE_${Date.now()}`,
      description: "Original Description",
      discount_percentage: 10,
      type: "subtotal",
      is_active: true,
    });
  });

  describe("PUT /api/v1/coupons/[id]", () => {
    test("should update coupon details successfully", async () => {
      const response = await fetch(
        `${orchestrator.webserverUrl}/api/v1/coupons/${couponToUpdate.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${adminToken}`,
          },
          body: JSON.stringify({
            description: "Updated Description",
            discount_percentage: 15,
            type: "shipping", // Deve mapear para coupon_type internamente
          }),
        },
      );

      const responseBody = await response.json();
      expect(response.status).toBe(200);
      expect(responseBody.description).toBe("Updated Description");
      expect(responseBody.discount_percentage).toBe(15);
      expect(responseBody.type).toBe("shipping");
    });

    test("should return 403 if user does not have permission", async () => {
      const commonUser = await user.create({
        username: "commonEdit",
        email: "commonedit@test.com",
        password: "StrongPassword123@",
      });
      await user.update({ id: commonUser.id, password: "StrongPassword123@" });
      const commonSession = await session.create(commonUser);

      const response = await fetch(
        `${orchestrator.webserverUrl}/api/v1/coupons/${couponToUpdate.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${commonSession.token}`,
          },
          body: JSON.stringify({ description: "Hacker" }),
        },
      );

      expect(response.status).toBe(403);
    });

    test("should return 404 if coupon does not exist", async () => {
      const fakeId = "00000000-0000-4000-8000-000000000000";
      const response = await fetch(
        `${orchestrator.webserverUrl}/api/v1/coupons/${fakeId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${adminToken}`,
          },
          body: JSON.stringify({ description: "Ghost" }),
        },
      );

      expect(response.status).toBe(404);
    });
  });

  describe("DELETE /api/v1/coupons/[id]", () => {
    test("should soft delete (deactivate) a coupon", async () => {
      const response = await fetch(
        `${orchestrator.webserverUrl}/api/v1/coupons/${couponToUpdate.id}`,
        {
          method: "DELETE",
          headers: {
            cookie: `session_id=${adminToken}`,
          },
        },
      );

      const responseBody = await response.json();
      expect(response.status).toBe(200);
      expect(responseBody.id).toBe(couponToUpdate.id);
      expect(responseBody.is_active).toBe(false);
    });

    test("should return 404 if coupon does not exist", async () => {
      const fakeId = "00000000-0000-4000-8000-000000000000";
      const response = await fetch(
        `${orchestrator.webserverUrl}/api/v1/coupons/${fakeId}`,
        {
          method: "DELETE",
          headers: {
            cookie: `session_id=${adminToken}`,
          },
        },
      );
      expect(response.status).toBe(404);
    });
  });
});
