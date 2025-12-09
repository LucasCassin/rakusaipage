import cart from "models/cart.js";
import product from "models/product.js";
import { ValidationError } from "errors/index.js";
import orchestrator from "tests/orchestrator.js";
import user from "models/user.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("Model: Cart", () => {
  let user1, userId;
  let productId;

  // Setup: Cria um usuário (dummy ID) e um produto para usar nos testes
  beforeAll(async () => {
    // Como não estamos testando User aqui, podemos gerar um UUID falso se não houver FK constraint estrita
    // Mas seu banco tem FK, então vamos criar um usuário via query direta ou mock se possível.
    // O orchestrator limpa o banco, então precisamos criar dados reais.

    // 1. Criar Usuario
    user1 = await user.create({
      username: "cart",
      email: "cart@test.com",
      password: "StrongPassword123@",
    });
    userId = user1.id;

    // 2. Criar Produto
    const prod = await product.create({
      name: "Produto Carrinho",
      slug: "prod-carrinho",
      description: "Desc",
      category: "Test",
      price_in_cents: 1000,
      minimum_price_in_cents: 900,
      stock_quantity: 50,
      weight_in_grams: 100,
      length_cm: 10,
      height_cm: 10,
      width_cm: 10,
    });
    productId = prod.id;
  });

  test("should create a cart automatically when getting it", async () => {
    const myCart = await cart.getOrCreate(userId);
    expect(myCart.id).toBeDefined();
    expect(myCart.user_id).toBe(userId);
  });

  test("should add an item to the cart", async () => {
    const item = await cart.addItem(userId, {
      product_id: productId,
      quantity: 2,
    });

    expect(item.quantity).toBe(2);
    expect(item.product_id).toBe(productId);
  });

  test("should increment quantity if item already exists", async () => {
    // Já adicionamos 2 no teste anterior. Adicionando +3.
    const item = await cart.addItem(userId, {
      product_id: productId,
      quantity: 3,
    });

    expect(item.quantity).toBe(5); // 2 + 3
  });

  test("should return full cart with product details and totals", async () => {
    const fullCart = await cart.getCart(userId);

    expect(fullCart.items).toHaveLength(1);
    expect(fullCart.items[0].name).toBe("Produto Carrinho");
    expect(fullCart.items[0].quantity).toBe(5);
    // Preço 1000 * 5 = 5000
    expect(fullCart.total_in_cents).toBe(5000);
  });

  test("should update item quantity explicitly", async () => {
    const updated = await cart.updateItemQuantity(userId, productId, 10);
    expect(updated.quantity).toBe(10);
  });

  test("should remove item from cart", async () => {
    await cart.removeItem(userId, productId);

    const fullCart = await cart.getCart(userId);
    expect(fullCart.items).toHaveLength(0);
    expect(fullCart.total_in_cents).toBe(0);
  });

  test("should throw error when adding invalid quantity", async () => {
    await expect(
      cart.addItem(userId, {
        product_id: productId,
        quantity: -1,
      }),
    ).rejects.toThrow(ValidationError);
  });
});
