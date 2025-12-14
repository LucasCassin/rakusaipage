exports.up = async (pgm) => {
  // 1. Adicionar Code (Código Amigável) e Tracking History
  await pgm.addColumns("orders", {
    code: {
      type: "varchar(20)",
      notNull: false, // Começa false para não quebrar dados antigos, depois populamos se precisar
      unique: true,
      comment: "Código amigável para o cliente (ex: #ABC-1234)",
    },
    tracking_history: {
      type: "jsonb",
      default: "[]",
      comment: "Histórico detalhado de eventos de rastreio",
    },
  });

  // 2. Atualizar a Constraint de Status
  // O Postgres não permite alterar o CHECK facilmente, precisamos dropar e recriar
  await pgm.dropConstraint("orders", "orders_status_check");

  await pgm.addConstraint("orders", "orders_status_check", {
    check: `status IN (
      'pending', 
      'paid', 
      'preparing', 
      'shipped', 
      'ready_for_pickup', 
      'picked_up', 
      'delivered', 
      'canceled', 
      'refunded'
    )`,
  });

  // Opcional: Criar índice para busca rápida pelo código
  await pgm.createIndex("orders", "code");
};

exports.down = async (pgm) => {
  await pgm.dropColumns("orders", ["code", "tracking_history"]);
  await pgm.dropConstraint("orders", "orders_status_check");
  // Reverte para os status antigos
  await pgm.addConstraint(
    "orders",
    "orders_status_check",
    "status IN ('pending', 'paid', 'preparing', 'shipped', 'delivered', 'canceled', 'refunded')",
  );
};
