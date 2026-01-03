import { calcularPrecoPrazo } from "correios-brasil";
import { ServiceError } from "errors/index.js";
import validator from "models/validator.js";
import productModel from "models/product.js";

const MARGIN_PERCENTAGE = 0.05; // 5%

/**
 * Processa os itens do carrinho para extrair métricas de peso, dimensões e flags de logística.
 */
async function processCartItems(items) {
  let totalWeightInGrams = 0;
  let maxDim = { c: 0, l: 0, a: 0 }; // Comprimento, Largura, Altura

  // Flags para controle de fluxo (Digital vs Físico)
  let hasPhysicalItems = false;
  let hasDigitalItems = false;
  // Variável totalValue removida pois era calculada mas não utilizada na lógica original
  // let totalValue = 0;

  // Flags de restrição (só importam se tiver item físico)
  let canPickup = true;
  let canDelivery = true;
  let pickupAddress = null;
  let pickupInstructions = null;

  for (const item of items) {
    // O objeto 'item' agora vem enriquecido do model 'cart'
    // com todos os dados do produto.

    if (item === undefined || item === null || !item.is_active) {
      continue;
    }

    // Lógica para Produtos Digitais
    if (item.is_digital) {
      hasDigitalItems = true;
      // Não soma peso nem dimensões, e não trava entrega/retirada
      continue;
    }

    // Se chegou aqui, é um item físico
    hasPhysicalItems = true;

    totalWeightInGrams += item.weight_in_grams * item.quantity;
    // totalValue += (product.price_in_cents / 100) * quantity;

    // Lógica simplificada de caixa cúbica: soma alturas, mantém maior base (apenas estimativa)
    maxDim.c = Math.max(maxDim.c, item.length_cm);
    maxDim.l = Math.max(maxDim.l, item.width_cm);
    maxDim.a += item.height_cm * item.quantity;

    if (!item.allow_pickup) canPickup = false;
    if (!item.allow_delivery) canDelivery = false;

    if (item.pickup_address && !pickupAddress) {
      pickupAddress = item.pickup_address;
      pickupInstructions = item.pickup_instructions;
    }
  }

  return {
    totalWeightInGrams,
    maxDim,
    hasPhysicalItems,
    hasDigitalItems,
    canPickup,
    canDelivery,
    pickupAddress,
    pickupInstructions,
  };
}

/**
 * Busca opções de frete nos Correios ou retorna Mock em desenvolvimento.
 */
async function fetchCorreiosOptions(shippingParams) {
  // --- MOCK PARA TESTES AUTOMATIZADOS ---
  if (
    process.env.NODE_ENV === "test" ||
    process.env.NODE_ENV === "development"
  ) {
    return [
      {
        type: "PAC",
        name: "PAC (Econômica)",
        price_in_cents: 2100, // 2000 + 5%
        days: 5,
        carrier: "Correios",
      },
    ];
  }

  try {
    const response = await calcularPrecoPrazo(shippingParams);
    const options = [];

    response.forEach((servico) => {
      if (servico.Erro && servico.Erro !== "0") {
        return;
      }

      const price = parseFloat(servico.Valor.replace(",", "."));
      const priceWithMargin = Math.ceil(price * 100 * (1 + MARGIN_PERCENTAGE));

      options.push({
        type: servico.Codigo === "04014" ? "SEDEX" : "PAC",
        name:
          servico.Codigo === "04014" ? "Sedex (Expresso)" : "PAC (Econômica)",
        price_in_cents: priceWithMargin,
        days: parseInt(servico.PrazoEntrega) + 3, // +3 dias de manuseio
        carrier: "Correios",
      });
    });

    return options;
  } catch (error) {
    console.error("Erro ao calcular Correios:", error);
    throw new ServiceError({
      message: "Erro ao calcular frete.",
      action: "Tente novamente mais tarde.",
    });
  }
}

/**
 * Calcula frete real nos Correios e opções de retirada.
 * Suporta produtos digitais (is_digital) ignorando peso/dimensões.
 */
async function calculateShippingOptions(zipCode, items) {
  const cleanData = validator(
    { zip_code: zipCode, shop_items: items },
    {
      zip_code: "required",
      shop_items: "required",
    },
  );

  // 1. Processa itens e obtém métricas consolidadas
  const stats = await processCartItems(cleanData.shop_items);
  const options = [];

  // CENÁRIO 1: Apenas Itens Digitais no Carrinho
  // Retorna opção gratuita imediata
  if (!stats.hasPhysicalItems && stats.hasDigitalItems) {
    return [
      {
        type: "DIGITAL",
        name: "Envio por E-mail / Download",
        price_in_cents: 0,
        days: 0,
        carrier: "Digital",
      },
    ];
  }

  // CENÁRIO 2: Existem Itens Físicos (Misto ou Só Físico)
  // Calcula o frete baseado apenas nos itens físicos (peso e dimensões somados acima)
  if (stats.hasPhysicalItems) {
    // 2. Opção de Retirada
    if (stats.canPickup) {
      options.push({
        type: "PICKUP",
        name: "Retirada no Local",
        price_in_cents: 0,
        days: 3,
        address: stats.pickupAddress,
        instructions: stats.pickupInstructions,
      });
    }

    // 3. Opção de Entrega (API Correios)
    if (stats.canDelivery) {
      // Ajustes limites Correios (Mínimos)
      const shippingParams = {
        sCepOrigem: "09020230", // CEP da Bunka Santo André
        sCepDestino: cleanData.zip_code.replace(/\D/g, ""),
        nVlPeso: Math.max(stats.totalWeightInGrams / 1000, 0.3).toString(), // Min 300g
        nCdFormato: "1", // Caixa/Pacote
        nVlComprimento: Math.max(stats.maxDim.c, 16).toString(),
        nVlAltura: Math.max(stats.maxDim.a, 2).toString(),
        nVlLargura: Math.max(stats.maxDim.l, 11).toString(),
        nCdServico: ["04014", "04510"], // 04014=SEDEX, 04510=PAC
        nVlDiametro: "0",
      };

      const deliveryOptions = await fetchCorreiosOptions(shippingParams);
      options.push(...deliveryOptions);
    }
  }

  return options;
}

export default {
  calculateShippingOptions,
};
