import orchestrator from "tests/orchestrator.js";
import product from "models/product.js";

describe("POST /api/v1/shipping/calculate", () => {
  let heavyProduct, pickupProduct;

  beforeAll(async () => {
    await orchestrator.waitForAllServices();
    await orchestrator.clearDatabase();
    await orchestrator.runPendingMigrations();

    // Produto 1: Só Entrega
    heavyProduct = await product.create({
      name: "Anilha 20kg",
      slug: "anilha",
      description: "...",
      category: "Gym",
      price_in_cents: 20000,
      minimum_price_in_cents: 10000,
      stock_quantity: 10,
      weight_in_grams: 20000,
      length_cm: 30,
      height_cm: 30,
      width_cm: 5,
      allow_delivery: true,
      allow_pickup: false,
      images: [],
    });

    // Produto 2: Retirada (Com dados obrigatórios)
    pickupProduct = await product.create({
      name: "Camiseta",
      slug: "camiseta",
      description: "...",
      category: "Wear",
      price_in_cents: 5000,
      minimum_price_in_cents: 2000,
      stock_quantity: 50,
      weight_in_grams: 200,
      length_cm: 20,
      height_cm: 20,
      width_cm: 2,
      allow_delivery: true,
      allow_pickup: true,
      pickup_address: "Rua do Dojo, 123",
      pickup_instructions: "Horário Comercial",
      images: [],
    });
  });

  test("should return delivery options (Mocked Correios)", async () => {
    const response = await fetch(
      `${orchestrator.webserverUrl}/api/v1/shipping/calculate`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          zip_code: "12345-678",
          items: [{ product_id: heavyProduct.id, quantity: 1 }],
        }),
      },
    );

    const body = await response.json();

    // -----------------------------------------------------

    expect(response.status).toBe(200);
    expect(Array.isArray(body)).toBe(true); // Garante que é array antes de usar find

    // Verifica se NÃO tem pickup
    const hasPickup = body.find((o) => o.type === "PICKUP");
    expect(hasPickup).toBeUndefined();

    // Verifica se tem PAC
    const pacOption = body.find((o) => o.type === "PAC");
    expect(pacOption).toBeDefined();
    expect(pacOption.price_in_cents).toBe(2100);
  });

  test("should return pickup option with details", async () => {
    const response = await fetch(
      `${orchestrator.webserverUrl}/api/v1/shipping/calculate`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          zip_code: "12345-678",
          items: [{ product_id: pickupProduct.id, quantity: 1 }],
        }),
      },
    );

    const body = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(body)).toBe(true);

    const pickupOption = body.find((o) => o.type === "PICKUP");

    expect(pickupOption).toBeDefined();
    expect(pickupOption.price_in_cents).toBe(0);
    expect(pickupOption.address).toBe("Rua do Dojo, 123");
    expect(pickupOption.instructions).toBe("Horário Comercial");
  });
});
