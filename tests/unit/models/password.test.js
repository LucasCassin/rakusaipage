import password from "../../../models/password";

describe("Password Model", () => {
  describe("hashPassword", () => {
    it("should return a hash for the provided password", async () => {
      const plainPassword = "senha123";
      const hashedPassword = await password.hashPassword(plainPassword);

      expect(hashedPassword).not.toBe(plainPassword);
      expect(hashedPassword).toMatch(/^\$2[aby]\$.{56}$/); // Verifica se o hash segue o formato do bcrypt
    });
  });

  describe("comparePassword", () => {
    it("should return true if the password matches the hash", async () => {
      const plainPassword = "senha123";
      const hashedPassword = await password.hashPassword(plainPassword);

      const result = await password.comparePassword(
        plainPassword,
        hashedPassword,
      );
      expect(result).toBe(true);
    });

    it("should return false if the password does not match the hash", async () => {
      const plainPassword = "senha123";
      const hashedPassword = await password.hashPassword(plainPassword);

      const result = await password.comparePassword(
        "senhaErrada",
        hashedPassword,
      );
      expect(result).toBe(false);
    });
  });
});
