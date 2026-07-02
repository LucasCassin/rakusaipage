export function formatCurrencyInCents(valueInCents) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format((valueInCents || 0) / 100);
}
