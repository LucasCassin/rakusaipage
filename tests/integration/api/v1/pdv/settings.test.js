import orchestrator from "tests/orchestrator.js";
import user from "models/user.js";
import session from "models/session.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("API /api/v1/pdv/settings", () => {
  let adminSession, sellerSession, unauthorizedSession, expiredSession;

  beforeAll(async () => {
    const adminUser = await user.findOneUser({ username: "mainUser" });
    const updatedAdmin = await user.update({
      id: adminUser.id,
      password: "StrongPassword123@",
    });
    await user.addFeatures(updatedAdmin, ["pdv:config:manage"]);
    adminSession = await session.create(updatedAdmin);

    let sellerUser = await user.create({
      username: "pdvSettingsSeller",
      email: "pdv-settings-seller@test.com",
      password: "StrongPassword123@",
    });
    sellerUser = await user.update({
      id: sellerUser.id,
      password: "StrongPassword123@",
    });
    await user.addFeatures(sellerUser, ["pdv:sell"]);
    sellerSession = await session.create(sellerUser);

    let unauthorizedUser = await user.create({
      username: "pdvSettingsNoPerms",
      email: "pdv-settings-noperms@test.com",
      password: "StrongPassword123@",
    });
    unauthorizedUser = await user.update({
      id: unauthorizedUser.id,
      password: "StrongPassword123@",
    });
    await user.removeFeatures(unauthorizedUser, unauthorizedUser.features);
    unauthorizedSession = await session.create(unauthorizedUser);

    const expiredUser = await user.create({
      username: "pdvSettingsExpired",
      email: "pdv-settings-expired@test.com",
      password: "StrongPassword123@",
    });
    await user.addFeatures(expiredUser, ["pdv:config:manage"]);
    await user.expireUserPassword(expiredUser);
    expiredSession = await session.create(expiredUser);
  });

  describe("Security Check", () => {
    test("Anonymous user should get 403 on GET", async () => {
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/pdv/settings`,
      );
      expect(res.status).toBe(403);
    });

    test("User without any pdv feature should get 403 on GET", async () => {
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/pdv/settings`,
        {
          headers: { cookie: `session_id=${unauthorizedSession.token}` },
        },
      );
      expect(res.status).toBe(403);
    });

    test("User with expired password should get 403 PasswordExpiredError", async () => {
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/pdv/settings`,
        {
          headers: { cookie: `session_id=${expiredSession.token}` },
        },
      );
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.name).toBe("PasswordExpiredError");
    });

    test("Seller (pdv:sell only) should be able to GET", async () => {
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/pdv/settings`,
        {
          headers: { cookie: `session_id=${sellerSession.token}` },
        },
      );
      expect(res.status).toBe(200);
    });

    test("Seller (pdv:sell only) should get 403 on PUT", async () => {
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/pdv/settings`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${sellerSession.token}`,
          },
          body: JSON.stringify({ min_cart_value_in_cents: 100 }),
        },
      );
      expect(res.status).toBe(403);
    });
  });

  describe("PUT /api/v1/pdv/settings", () => {
    test("Admin should partially update settings without wiping other fields", async () => {
      const firstRes = await fetch(
        `${orchestrator.webserverUrl}/api/v1/pdv/settings`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${adminSession.token}`,
          },
          body: JSON.stringify({ min_cart_value_in_cents: 700 }),
        },
      );
      expect(firstRes.status).toBe(200);

      const secondRes = await fetch(
        `${orchestrator.webserverUrl}/api/v1/pdv/settings`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${adminSession.token}`,
          },
          body: JSON.stringify({ max_discount_in_cents: 1500 }),
        },
      );
      expect(secondRes.status).toBe(200);
      const secondBody = await secondRes.json();
      expect(secondBody.max_discount_in_cents).toBe(1500);
      expect(secondBody.min_cart_value_in_cents).toBe(700);
    });

    test("Should return 400 for a negative min_cart_value_in_cents", async () => {
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/pdv/settings`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${adminSession.token}`,
          },
          body: JSON.stringify({ min_cart_value_in_cents: -100 }),
        },
      );
      expect(res.status).toBe(400);
    });

    test("Admin should update the percentage discount cap", async () => {
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/pdv/settings`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${adminSession.token}`,
          },
          body: JSON.stringify({ max_discount_percentage: 10 }),
        },
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.max_discount_percentage).toBe(10);
    });

    test("Should return 400 for a percentage above 100", async () => {
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/pdv/settings`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${adminSession.token}`,
          },
          body: JSON.stringify({ max_discount_percentage: 150 }),
        },
      );
      expect(res.status).toBe(400);
    });
  });
});
