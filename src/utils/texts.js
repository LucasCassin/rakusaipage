export const texts = {
  sections: {
    heroSection: {
      title: "Rakusai Taiko",
      description: "A força e a alma da batida japonesa em Santo André",
    },
  },
  login: {
    title: "Login",
    label: {
      email: "E-mail",
      password: "Senha",
    },
    placeholder: {
      email: "Digite seu e-mail",
      password: "Digite sua senha",
    },
    button: {
      submit: "Entrar",
      loading: "Entrando...",
    },
    errorMapping: {
      email: "O e-mail",
      password: "A senha",
    },
    message: {
      error: {
        invalidCredentials: "E-mail ou senha inválidos.",
        connection:
          "Erro de conexão. Verifique sua internet e tente novamente.",
        passwordExpired:
          "Sua senha expirou. Por favor, defina uma nova senha.\nVocê será redirecionado em breve",
      },
      success: {
        login:
          "Login realizado com sucesso! Redirecionando para a página inicial...",
      },
    },
  },
  register: {
    title: "Criar conta",
    label: {
      username: "Nome de usuário",
      email: "Email",
      password: "Senha",
    },
    errorMapping: {
      username: "Nome de usuário",
      email: "O e-mail",
      password: "A senha",
    },
    placeholder: {
      username: "Nome de usuário",
      email: "Email",
      password: "Senha",
    },
    button: {
      submit: "Cadastrar",
      loading: "Cadastrando...",
      logoutAndContinue: "Sair e continuar",
      generatePassword: "Gerar senha forte aleatória",
    },
    message: {
      success: {
        registration:
          "Cadastro realizado com sucesso! Redirecionando para o login...",
      },
      error: {
        loggedIn: "Você não pode criar uma nova conta enquanto estiver logado.",
        termsRequired: "Você precisa aceitar os termos de uso para continuar.",
        connection:
          "Erro de conexão. Verifique sua internet e tente novamente.",
        passwordCriteria: "A senha deve atender todos os critérios abaixo",
        passwordSecurity:
          "A senha deve atender todos os critérios de segurança",
      },
    },
    terms: {
      label: "Li e aceito os",
      terms: "termos de uso",
      and: "e",
      privacy: "política de privacidade",
      privacyContent: {
        title: "Política de Privacidade",
        sections: [
          {
            title: "1. Coleta de Dados",
            content:
              "Coletamos apenas os dados necessários para o funcionamento do sistema, incluindo nome, e-mail e senha. Esses dados são essenciais para a criação e gerenciamento da sua conta, garantindo uma experiência personalizada e segura.",
          },
          {
            title: "2. Uso dos Dados",
            content:
              "Seus dados são utilizados exclusivamente para os fins especificados no momento da coleta. Não compartilhamos suas informações com terceiros sem sua autorização explícita, exceto quando exigido por lei.",
          },
          {
            title: "3. Proteção de Dados",
            content:
              "Implementamos medidas de segurança robustas para proteger suas informações, incluindo criptografia de dados, firewalls e monitoramento contínuo. Nossa equipe está comprometida em manter seus dados seguros e confidenciais.",
          },
          {
            title: "4. Seus Direitos",
            content:
              "Você tem direito de acessar, corrigir e excluir seus dados pessoais a qualquer momento. Também pode solicitar uma cópia dos seus dados ou revogar o consentimento para o processamento das informações.",
          },
          {
            title: "5. Contato",
            content:
              "Para questões sobre privacidade ou exercício dos seus direitos, entre em contato conosco através do e-mail de suporte. Nossa equipe está pronta para ajudar e esclarecer qualquer dúvida relacionada à proteção dos seus dados.",
          },
        ],
      },
      termsContent: {
        title: "Termos de Uso",
        sections: [
          {
            title: "1. Aceitação dos Termos",
            content:
              "Ao acessar e usar este sistema, você concorda com estes termos de uso em sua totalidade. Se não concordar com qualquer parte destes termos, por favor, não utilize o sistema.",
          },
          {
            title: "2. Uso do Sistema",
            content:
              "O sistema deve ser usado apenas para fins legítimos e de acordo com todas as leis aplicáveis. Você é responsável por todas as atividades realizadas através da sua conta.",
          },
          {
            title: "3. Conta de Usuário",
            content:
              "Você é responsável por manter a confidencialidade de sua conta e senha. Qualquer atividade realizada através da sua conta será considerada como sua responsabilidade.",
          },
          {
            title: "4. Privacidade",
            content:
              "Seu uso do sistema está sujeito à nossa Política de Privacidade, que descreve como coletamos, usamos e protegemos suas informações pessoais.",
          },
          {
            title: "5. Modificações",
            content:
              "Reservamos o direito de modificar estes termos a qualquer momento. Alterações significativas serão comunicadas através do sistema ou por e-mail.",
          },
        ],
      },
    },
    passwordCriteria: {
      title: "A senha deve conter:",
      length: "Mínimo de 8 caracteres",
      lowercase: "Uma letra minúscula",
      uppercase: "Uma letra maiúscula",
      number: "Um número",
      special: "Um caractere especial (@$!%*?&)",
    },
    loginLink: "Já tem uma conta? Faça login",
  },
  logout: {
    message: {
      loading: "Saindo...",
      success: "Sessão finalizada.",
      error: {
        connection:
          "Erro de conexão. Verifique sua internet e tente novamente.",
      },
    },
  },
  profile: {
    title: "Perfil do Usuário",
    userInfoTitle: "Informações do Usuário",
    featuresTitle: "Features",
    label: {
      username: "Nome de usuário:",
      email: "Email:",
      createdAt: "Criado em:",
      updatedAt: "Última atualização:",
      passwordExpires: "Senha expira em:",
    },
    errorMapping: {
      username: "Nome de usuário",
    },
    button: {
      edit: "Editar Perfil",
      self: "Meu perfil",
      other: "Perfil de outro usuário",
      search: "Buscar",
      loading: "Buscando...",
    },
    placeholder: {
      username: "Digite o nome do usuário",
    },
    message: {
      loading: "Carregando perfil...",
      error: {
        fetch: "Erro ao buscar usuário",
        noPermission: "Você não tem permissão para visualizar perfis.",
        connection:
          "Erro de conexão. Verifique sua internet e tente novamente.",
        notAuthenticated: "Você não está autenticado. Por favor, faça login.",
        searchError: "Por favor, informe um nome de usuário para buscar.",
        searchSelf:
          "Você não pode visualizar seu próprio perfil no modo 'Outro Usuário'. Use o modo 'Meu Perfil'.",
      },
      warning: {
        passwordExpired: {
          message: "Sua senha expirará em",
          days: "dias.",
          button: "Clique aqui para definir uma nova senha",
          warningTitle: "Sua senha está próxima de expirar!",
          errorTitle: "Atenção!",
        },
      },
    },
  },
  profileEdit: {
    title: "Editar Perfil",
    label: {
      username: "Nome de usuário",
      email: "Email",
      features: "Features do Usuário",
    },
    errorMapping: {
      username: "Nome de usuário",
      email: "O e-mail",
    },
    placeholder: {
      username: "Digite o nome do usuário",
      email: "Email",
    },
    button: {
      search: "Buscar",
      update: "Atualizar",
      loading: "Atualizando...",
      self: "Atualizar meu perfil",
      other: "Atualizar outro usuário",
    },
    message: {
      success: "Perfil atualizado com sucesso!",
      error: {
        connection:
          "Erro de conexão. Verifique sua internet e tente novamente.",
        noUser: "Primeiro busque por um usuário.",
        noChanges:
          "Nenhuma alteração foi feita. Por favor, faça alguma alteração antes de salvar.",
        noPermission: "Você não tem permissão para atualizar o perfil.",
        noPermissionOther:
          "Você não tem permissão para atualizar outro usuário.",
        fetch: "Erro ao buscar usuário",
        notAuthenticated: "Você não está autenticado. Por favor, faça login.",
        searchError: "Por favor, informe um nome de usuário para buscar.",
        userRequired: "Primeiro busque por um usuário.",
        searchSelf:
          "Você não pode atualizar seu próprio perfil no modo 'Outro Usuário'. Use o modo 'Meu Perfil'.",
      },
    },
  },
  profilePassword: {
    title: "Atualizar Senha",
    titleExpired: "Senha Expirada",
    label: {
      password: "Nova Senha",
    },
    errorMapping: {
      password: "A senha",
      username: "Nome de usuário",
    },
    placeholder: {
      username: "Digite o nome do usuário",
      password: "Nova Senha",
    },
    button: {
      search: "Buscar",
      update: "Atualizar Senha",
      loading: "Atualizando...",
      self: "Atualizar minha senha",
      other: "Atualizar senha de outro usuário",
      generatePassword: "Gerar senha forte aleatória",
    },
    message: {
      success: {
        self: "Senha atualizada com sucesso! Você será desconectado e precisará fazer login novamente.",
        other: "Senha atualizada com sucesso! Ela está expirada",
      },
      error: {
        connection:
          "Erro de conexão. Verifique sua internet e tente novamente.",
        noUser: "Primeiro busque por um usuário.",
        noChanges: "Nenhuma alteração foi feita.",
        noPermission: "Você não tem permissão para atualizar senhas.",
        notAuthenticated: "Você não está autenticado. Por favor, faça login.",
        passwordExpired:
          "Sua senha expirou! Por favor, defina uma nova senha para continuar.",
        security: "A senha deve atender todos os critérios de segurança",
        criteria: "A senha deve atender todos os critérios abaixo",
        searchSelf:
          "Você não pode atualizar sua própria senha no modo 'Outro Usuário'. Use o modo 'Meu Perfil'.",
      },
    },
    passwordCriteria: {
      title: "A senha deve conter:",
      length: "Mínimo de 8 caracteres",
      lowercase: "Uma letra minúscula",
      uppercase: "Uma letra maiúscula",
      number: "Um número",
      special: "Um caractere especial (@$!%*?&)",
    },
  },
  layout: {
    message: {
      loading: "Carregando...",
      copyright: "© Lucas Cassin - 2025 - Todos os direitos reservados",
    },
  },
  header: {
    title: "Sistema",
    menu: {
      others: "Outros",
      viewProfile: "Ver perfil",
    },
    button: {
      login: "Entrar",
      register: "Cadastrar",
    },
    mobile: {
      menu: "Abrir menu",
      othersTitle: "Outros",
    },
  },
  homeContent: {
    welcome: {
      title: "Bem-vindo ao Sistema",
      description: "Para acessar o sistema, faça login ou crie uma conta.",
      loggedInTitle: "Bem-vindo, {username}!",
      loggedInDescription:
        "Acesse rapidamente as ferramentas e fique por dentro dos comunicados.",
    },
    button: {
      login: "Entrar",
      register: "Criar Conta",
    },
    sections: {
      quickAccess: "Acesso Rápido",
      communications: "Comunicados",
    },
  },
  apiResponse: {
    error: {
      connection: "Erro de conexão. Verifique sua internet e tente novamente.",
    },
  },
  migrations: {
    title: "Migrações",
    description: "Visualize e controle migrações do banco de dados",
    pendingTitle: "Migrações Pendentes",
    status: {
      pending: "Pendente",
      completed: "Concluída",
      failed: "Falhou",
      running: "Em execução",
    },
    table: {
      id: "ID",
      name: "Nome",
      status: "Status",
      createdAt: "Criada em",
      runAt: "Executada em",
      actions: "Ações",
    },
    button: {
      run: "Executar Migrações",
      running: "Executando...",
      details: "Detalhes",
      back: "Voltar",
      check: "Verificar Migrações Pendentes",
      loading: "Carregando...",
    },
    message: {
      noMigrations: "Não há migrações pendentes.",
      confirmRun: "Tem certeza que deseja executar esta migração?",
      runSuccess: "Migrações executadas com sucesso!",

      error: {
        connection:
          "Erro de conexão. Verifique sua internet e tente novamente.",
        noPermission: "Você não tem permissão para executar migrações.",
        notAuthenticated: "Você não está autenticado. Por favor, faça login.",
        noPermissionRead:
          "Você não tem permissão para ler as migrações pendentes.",
      },
    },
  },
  status: {
    title: "Status do Sistema",
    description: "Verifique o estado dos serviços e componentes do sistema",
    services: {
      title: "Dependências",
      database: "Banco de Dados",
    },
    status: {
      operational: "Operacional",
      degraded: "Degradado",
      down: "Fora do ar",
      maintenance: "Em manutenção",
    },
    uptime: {
      title: "Tempo Online",
      days: "dias",
      hours: "horas",
      minutes: "minutos",
    },
    lastCheck: "Última atualização:",
    connections: "Conexões:",
    postgresVersion: "Versão do PostgreSQL:",
    message: {
      loading: "Carregando...",
      loadingDependencies: "Carregando dependências...",
      error: {
        connection:
          "Erro de conexão. Verifique sua internet e tente novamente.",
      },
    },
  },
  tables: {
    title: "Tabelas",
    description: "Visualize e gerencie dados em tabelas",
    label: {
      name: "Nome",
      price: "Preço",
      status: "Status do Serviço",
    },
    placeholder: {
      search: "Buscar...",
      name: "Digite o nome do",
      price: "0,00",
      product: "produto",
      service: "serviço",
    },
    button: {
      add: "Adicionar",
      edit: "Editar",
      delete: "Excluir",
      save: "Salvar",
      cancel: "Cancelar",
      search: "Buscar",
      import: "Importar",
      export: "Exportar",
      selectAll: "Selecionar Todos",
      discard: "Descartar",
      confirm: "Confirmar",
      clearSearch: "Limpar Busca",
    },
    symbol: {
      price: "R$",
    },
    products: {
      title: "Produtos",
      headers: {
        code: "Código",
        name: "Nome do Produto",
        price: "Valor (R$)",
      },
      newProduct: "Novo Produto",
      editProduct: "Editar Produto",
    },
    services: {
      title: "Serviços",
      headers: {
        code: "Código",
        name: "Serviço",
        price: "Preço (R$)",
        isActive: "Serviço Ativo",
      },
      status: "Status do Serviço",
      newService: "Novo Serviço",
      editService: "Editar Serviço",
      active: "Ativo",
      inactive: "Inativo",
    },
    pagination: {
      previous: "Anterior",
      next: "Próximo",
      showing: "Mostrando",
      to: "a",
      of: "de",
      entries: "registros",
    },
    message: {
      noResults: "Nenhum resultado encontrado",
      selected: "selecionado(s)",
      loading: "Carregando...",
      editingItem: "item sendo editado",
      selectedItens: "item(ns) selecionado(s)",
      success: {
        add: "Item adicionado com sucesso!",
        import: "Importação concluída! {count} item(ns) importado(s).",
        delete: "{count} item(ns) excluído(s) com sucesso!",
      },
      error: {
        notAuthenticated: "Você não está autenticado. Por favor, faça login.",
        noPermission: "Você não tem permissão para acessar esta página.",
        emptyFile: "O arquivo está vazio ou contém apenas o cabeçalho",
        invalidFile: "Formato de arquivo não suportado. Use .xlsx ou .csv",
        importError: "Erro ao importar arquivo: ",
        exportError: "Erro ao exportar dados: ",
        csvEmptyFile: "O arquivo CSV está vazio ou contém apenas o cabeçalho",
        excelNotFound: "Planilha não encontrada no arquivo Excel",
        noValidItems:
          "Nenhum item válido encontrado no arquivo. Verifique se o arquivo está no formato correto.",
        noResults: "Nenhum resultado encontrado",
      },
      confirmation: {
        delete: "Tem certeza que deseja excluir",
        warning: "Esta ação não pode ser desfeita.",
        discard:
          "Tem certeza que deseja descartar as alterações? Esta ação não pode ser desfeita.",
        deleteTitle: "Confirmar Exclusão",
        discardTitle: "Confirmar Descarte",
      },
    },
  },
  home: {
    title: "Rakusai Taiko",
    description: "Grupo de Taiko em Santo André - SP",
  },
  errorPages: {
    notFound: {
      title: "Página não encontrada",
      message: "A página que você está procurando não existe",
      button: "Voltar para a página inicial",
    },
    forbidden: {
      title: "Acesso negado",
      message: "Você não tem permissão para acessar esta página",
      button: "Voltar para a página inicial",
    },
    serverError: {
      title: "Erro interno do servidor",
      message: "Ocorreu um erro no servidor. Tente novamente mais tarde.",
      button: "Voltar para a página inicial",
      reloadButton: "Tentar novamente",
    },
    badGateway: {
      title: "Bad Gateway",
      message:
        "O servidor encontrou um erro temporário. Tente novamente mais tarde.",
      button: "Voltar para a página inicial",
      reloadButton: "Tentar novamente",
    },
    serviceUnavailable: {
      title: "Serviço indisponível",
      message:
        "O serviço está temporariamente indisponível. Tente novamente mais tarde.",
      button: "Voltar para a página inicial",
      reloadButton: "Tentar novamente",
    },
    gatewayTimeout: {
      title: "Gateway Timeout",
      message:
        "O servidor não recebeu uma resposta a tempo. Tente novamente mais tarde.",
      button: "Voltar para a página inicial",
      reloadButton: "Tentar novamente",
    },
    forbiddenLogin: {
      title: "Acesso não permitido",
      message: "Você não tem permissão para acessar o sistema neste momento",
      button: "Voltar para a página inicial",
    },
  },
};
