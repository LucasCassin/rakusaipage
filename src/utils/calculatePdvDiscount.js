/**
 * Calcula o desconto final de um carrinho do PDV, aplicando o piso/tetos
 * configurados. Compartilhado entre o backend (`models/pdv_sale.js`, fonte
 * da verdade) e o frontend (tela do caixa), para que a prévia mostrada ao
 * vendedor seja sempre idêntica ao valor que a venda de fato vai fechar.
 */
export function calculatePdvDiscount({
  subtotalInCents,
  totalMinimumFloorInCents,
  discountType,
  discountValue,
  settings,
}) {
  if (discountType == null || discountValue == null) {
    return { discountInCents: 0, cappedBy: null };
  }

  const grossDiscountInCents =
    discountType === "percentage"
      ? Math.round(subtotalInCents * (discountValue / 100))
      : discountValue;

  // O teto pode ser configurado por valor bruto e/ou por percentual do
  // subtotal ao mesmo tempo — prevalece o que resultar no MENOR desconto.
  const candidates = [{ amountInCents: grossDiscountInCents, cappedBy: null }];
  if (settings.max_discount_in_cents != null) {
    candidates.push({
      amountInCents: settings.max_discount_in_cents,
      cappedBy: "max_amount",
    });
  }
  if (settings.max_discount_percentage != null) {
    candidates.push({
      amountInCents: Math.round(
        subtotalInCents * (settings.max_discount_percentage / 100),
      ),
      cappedBy: "max_percentage",
    });
  }
  candidates.sort((a, b) => a.amountInCents - b.amountInCents);
  let { amountInCents: discountInCents, cappedBy } = candidates[0];

  // O piso vale o MAIOR entre o piso do carrinho e a soma dos pisos
  // unitários dos produtos no carrinho — nenhum desconto pode furar nenhum
  // dos dois.
  const minCartValueInCents = settings.min_cart_value_in_cents ?? 0;
  const floorInCents = Math.max(totalMinimumFloorInCents, minCartValueInCents);
  const maxAllowedDiscountInCents = Math.max(0, subtotalInCents - floorInCents);

  if (maxAllowedDiscountInCents < discountInCents) {
    discountInCents = maxAllowedDiscountInCents;
    cappedBy =
      totalMinimumFloorInCents >= minCartValueInCents
        ? "unit_floor"
        : "cart_floor";
  }

  return {
    discountInCents,
    cappedBy: discountInCents < grossDiscountInCents ? cappedBy : null,
  };
}

// Frases prontas para compor "Desconto limitado <frase>." nas telas do caixa.
export const PDV_DISCOUNT_CAP_LABELS = {
  max_amount: "pelo teto de desconto em R$",
  max_percentage: "pelo teto de desconto em %",
  unit_floor: "pelo piso unitário dos produtos no carrinho",
  cart_floor: "pelo piso mínimo do carrinho",
};
