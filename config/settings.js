export const settings = {
  // Configurações globais
  global: {
    API: {
      ENDPOINTS: {
        SESSIONS: "/api/v1/sessions",
        USERS: "/api/v1/users",
        USER: "/api/v1/user",
        MIGRATIONS: "/api/v1/migrations",
        STATUS: "/api/v1/status",
      },
    },
    REDIRECTS: {
      HOME: "/",
      LOGIN: "/login",
      LOGOUT: "/logout",
      REGISTER: "/register",
      PROFILE: "/profile",
      PROFILE_EDIT: "/profile/edit",
      PROFILE_PASSWORD: "/profile/password",
      TABLES: "/tables",
      MIGRATIONS: "/migrations",
      STATUS: "/status",
    },
  },

  // Configurações de login
  auth: {
    REDIRECT_AFTER_LOGIN: "/",
    REDIRECT_AFTER_LOGOUT: "/",
    FORBIDDEN_REDIRECT: "/forbidden-login",
  },

  // Configurações de registro
  register: {
    REQUIRE_TERMS: true,
    REDIRECT_AFTER_REGISTER: "/login",
  },

  // Configurações de perfil
  profile: {
    FORBIDDEN_REDIRECT: "/403",
    PASSWORD_EXPIRED_REDIRECT: "/profile/password",
    FEATURE_READ_SELF: "read:user:self",
    FEATURE_READ_OTHER: "read:user:other",
    PASSWORD_EXPIRED_DAYS_TO_SHOW_WARNING: 14,
    PASSWORD_EXPIRED_DAYS_TO_SHOW_EXPIRED: 1,
    REDIRECT_TO_UPDATE_USER: "/profile/edit",
  },

  // Configurações de edição de perfil
  updateUser: {
    FORBIDDEN_REDIRECT: "/403",
    REDIRECT_AFTER_UPDATE: "/profile",
    FEATURE_UPDATE_SELF: "update:user:self",
    FEATURE_UPDATE_FEATURES_SELF: "update:user:features:self",
    FEATURE_UPDATE_FEATURES_OTHER: "update:user:features:other",
    FEATURE_READ_OTHER: "read:user:other",
  },

  // Configurações de atualização de senha
  updatePassword: {
    FORBIDDEN_REDIRECT: "/403",
    REDIRECT_AFTER_UPDATE: "/login",
    FEATURE_UPDATE_SELF: "update:user:self",
    FEATURE_UPDATE_OTHER: "update:user:other",
    FEATURE_READ_OTHER: "read:user:other",
  },

  // Configurações de migrações
  migrations: {
    FORBIDDEN_REDIRECT: "/403",
    FEATURE_READ_MIGRATIONS: "read:migration",
    FEATURE_CREATE_MIGRATIONS: "create:migration",
  },

  // Configurações de tabelas
  tables: {
    FORBIDDEN_REDIRECT: "/403",
    PAGINATION_LIMIT: 10,
    FEATURE_READ_TABLE: "read:table",
    FEATURE_UPDATE_TABLE: "update:table",
    PRODUCTS: {
      NAMES: [
        "Notebook Dell XPS 13",
        "iPhone 14 Pro",
        'Monitor LG 27"',
        "Teclado Mecânico RGB",
        "Mouse Gamer Logitech",
        "Cadeira Ergonômica",
        "Headset Bluetooth",
        "Webcam HD 1080p",
        "SSD 1TB Samsung",
        "Memória RAM 16GB",
        "Placa de Vídeo RTX 3060",
        "Processador Ryzen 7",
        "Tablet Samsung Galaxy",
        "Impressora HP LaserJet",
        "Roteador Wi-Fi 6",
        "Carregador USB-C 65W",
        "Hub USB 7 Portas",
        "Câmera DSLR Canon",
        "Microfone Blue Yeti",
        "Caixa de Som JBL",
        "Smart TV Samsung 4K",
        "Console PlayStation 5",
        "Console Xbox Series X",
        "Nintendo Switch OLED",
        "Smartwatch Apple Watch",
        "Drone DJI Mini 3",
        "Projetor Epson Full HD",
        "Scanner Epson V600",
        "Placa Mãe MSI B550",
        "Fonte ATX 750W",
        "Cooler CPU Noctua",
        "Case ATX Mid Tower",
        "Kit Teclado e Mouse Wireless",
        'Monitor Ultrawide 34"',
        "Câmera de Segurança IP",
        "Smart Lock Yale",
        "Lâmpada Smart RGB",
        "Assistente Virtual Echo",
        "Robô Aspirador Xiaomi",
        "Purificador de Ar",
        "Mesa Digitalizadora Wacom",
        "Kit de Ferramentas",
        "Bateria Externa 20000mAh",
        "Adaptador HDMI para USB-C",
        "Kit de Limpeza para Eletrônicos",
        "Organizador de Cabos",
        "Suporte para Notebook",
        "Mousepad RGB",
        "Kit de Manutenção PC",
        "Cabo de Rede Cat 6",
      ],
    },
    SERVICES: {
      NAMES: [
        "Manutenção de Computadores",
        "Instalação de Software",
        "Backup em Nuvem",
        "Consultoria em TI",
        "Desenvolvimento Web",
        "Suporte Técnico 24h",
        "Configuração de Rede",
        "Recuperação de Dados",
        "Formatação de Sistemas",
        "Instalação de Câmeras",
        "Automação Residencial",
        "Design Gráfico",
        "Marketing Digital",
        "Hospedagem de Sites",
        "Segurança Digital",
        "Edição de Vídeo",
        "Criação de Conteúdo",
        "Análise de Dados",
        "Treinamento em TI",
        "Gestão de Redes Sociais",
        "Desenvolvimento Mobile",
        "Consultoria de SEO",
        "Gestão de Tráfego Pago",
        "Criação de Sites Institucionais",
        "Desenvolvimento de E-commerce",
        "Consultoria de UX/UI",
        "Gestão de Projetos Ágeis",
        "Desenvolvimento de APIs",
        "Consultoria de Cloud Computing",
        "Gestão de Infraestrutura",
        "Consultoria de Segurança",
        "Desenvolvimento de Chatbots",
        "Gestão de CRM",
        "Consultoria de LGPD",
        "Desenvolvimento de Sistemas",
        "Gestão de Banco de Dados",
        "Consultoria de DevOps",
        "Desenvolvimento de Games",
        "Gestão de TI Verde",
        "Consultoria de Blockchain",
        "Desenvolvimento de IoT",
        "Gestão de Contratos",
        "Consultoria de Inovação",
        "Desenvolvimento de IA",
        "Gestão de Compliance",
        "Consultoria de Transformação Digital",
        "Desenvolvimento de Realidade Virtual",
        "Gestão de Portfólio",
        "Consultoria de Governança",
      ],
    },
  },

  // Configurações da página inicial
  home: {
    INTERNAL: {
      QUICK_ACCESS: [
        {
          name: "Tabelas",
          href: "/tables",
          icon: "TableCellsIcon",
          description: "Gerenciar tabelas do sistema",
          FEATURES: [["read:table"], ["read:table", "update:table"]],
        },
        {
          name: "Migrations",
          href: "/migrations",
          icon: "ArrowPathIcon",
          description: "Gerenciar migrações do banco de dados",
          FEATURES: [["read:migration"], ["create:migration"]],
        },
        {
          name: "Status",
          href: "/status",
          icon: "SignalIcon",
          description: "Verificar status do sistema",
        },
      ],
      COMMUNICATIONS: [
        {
          title: "Atualização do Sistema",
          date: "2024-03-20",
          description:
            "Nova versão do sistema foi lançada com melhorias de performance.",
          type: "info",
        },
        {
          title: "Manutenção Programada",
          date: "2024-03-25",
          description:
            "Sistema ficará indisponível das 02h às 04h para manutenção.",
          type: "warning",
        },
      ],
    },
  },

  // Configurações do cabeçalho
  header: {
    // LOGIN_REDIRECT: "/login",
    // CREATE_USER_REDIRECT: "/register",
    // LOGOUT_REDIRECT: "/logout",
    LOGIN_REDIRECT: "/",
    CREATE_USER_REDIRECT: "/",
    LOGOUT_REDIRECT: "/",
    NAVS: [
      {
        name: "Home",
        href: "/",
      },
      {
        name: "Sobre",
        href: "/#1",
      },
      {
        name: "Aulas",
        href: "/#2",
      },
      {
        name: "Vídeos",
        href: "/#3",
      },
      {
        name: "Fotos",
        href: "/#4",
      },
      {
        name: "Depoimentos",
        href: "/#5",
      },
      {
        name: "Contato",
        href: "/#6",
      },
      {
        name: "Área do Aluno",
        href: "/login",
      },
      // {
      //   name: "Home",
      //   href: "/",
      // },
      // {
      //   name: "Tabelas",
      //   href: "/tables",
      //   FEATURES: [["read:table"], ["read:table", "update:table"]],
      // },
    ],
    OTHER_NAVS: [
      // {
      //   name: "Status",
      //   href: "/status",
      // },
      // {
      //   name: "Migrations",
      //   href: "/migrations",
      //   FEATURES: [["read:migration"], ["create:migration"]],
      // },
    ],
    PROFILE_NAVS: [
      // [
      //   {
      //     name: "Meu Perfil",
      //     href: "/profile",
      //     FEATURES: [["read:user:self"], ["read:user:other"]],
      //     icon: "UserIcon",
      //   },
      // ],
      // [
      //   {
      //     name: "Editar Perfil",
      //     href: "/profile/edit",
      //     FEATURES: [
      //       ["update:user:self"],
      //       ["update:user:features:self"],
      //       ["read:user:other", "update:user:features:other"],
      //     ],
      //     icon: "PencilIcon",
      //   },
      //   {
      //     name: "Alterar Senha",
      //     href: "/profile/password",
      //     FEATURES: [
      //       ["update:user:self"],
      //       ["read:user:other", "update:user:other"],
      //     ],
      //     icon: "KeyIcon",
      //   },
      // ],
      // [
      //   {
      //     name: "Sair",
      //     href: "/logout",
      //     icon: "ArrowLeftOnRectangleIcon",
      //   },
      // ],
    ],
  },
};
