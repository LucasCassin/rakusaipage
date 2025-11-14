import scene from "models/scene.js";
import database from "infra/database.js";
import validator from "models/validator.js";
import { NotFoundError } from "errors/index.js";
import presentationViewer from "models/presentation_viewer.js";

// Mocks
jest.mock("infra/database.js");
jest.mock("models/validator.js");
jest.mock("models/presentation_viewer.js");

describe("Unit Tests for Scene Model", () => {
  let mockClient;

  beforeEach(() => {
    jest.clearAllMocks();
    validator.mockImplementation((data, schema) => data);

    // Configuração do mock de transação para 'clone'
    mockClient = {
      query: jest.fn(),
      end: jest.fn(),
    };
    database.getNewClient.mockResolvedValue(mockClient);

    // --- CORREÇÃO APLICADA AQUI ---
    // O mock agora verifica se 'query' é um objeto e tem 'query.text'
    // antes de tentar acessar 'query.text.includes'.
    mockClient.query.mockImplementation((query) => {
      // Verifica se query é um objeto com a propriedade 'text'
      if (query && typeof query === "object" && query.text) {
        if (query.text.includes("INSERT INTO scenes")) {
          return Promise.resolve({
            rows: [
              {
                id: "uuid-new-scene",
                name: query.values[2], // (Cópia) Nome
                scene_type: query.values[3],
              },
            ],
            rowCount: 1,
          });
        }
        if (query.text.includes("INSERT INTO element_groups")) {
          return Promise.resolve({
            rows: [{ id: "uuid-new-group" }],
            rowCount: 1,
          });
        }
      }

      // Para chamadas de string (BEGIN, COMMIT, ROLLBACK) e
      // outros INSERTs (elements, steps) que não precisam de retorno,
      // retorna uma promessa resolvida padrão.
      return Promise.resolve({ rows: [], rowCount: 0 });
    });
    // --- FIM DA CORREÇÃO ---

    // Mock padrão para o side effect (addViewer)
    presentationViewer.addViewer.mockResolvedValue({});

    // Mock para o 'handleDatabaseError' (usado no teste de rollback)
    database.handleDatabaseError = jest.fn((err) => err);
  });

  // --- (Sem alterações) ---
  describe("create", () => {
    it("should create a new scene", async () => {
      const sceneData = {
        presentation_id: "uuid-pres",
        order: 1,
        name: "Nova Cena",
        scene_type: "FORMATION",
        description: "Desc",
      };
      const mockReturn = { ...sceneData, id: "uuid-scene" };
      database.query.mockResolvedValue({ rows: [mockReturn], rowCount: 1 });

      const result = await scene.create(sceneData);

      expect(database.query).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockReturn);
    });
  });

  // --- (Sem alterações) ---
  describe("update", () => {
    it("should update an existing scene", async () => {
      const sceneId = "uuid-scene";
      const updateData = { name: "Nome Atualizado" };
      const mockReturn = { id: sceneId, name: "Nome Atualizado" };
      database.query.mockResolvedValue({ rows: [mockReturn], rowCount: 1 });

      const result = await scene.update(sceneId, updateData);

      expect(database.query).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockReturn);
    });

    it("should throw NotFoundError if scene not found", async () => {
      database.query.mockResolvedValue({ rows: [], rowCount: 0 });
      await expect(
        scene.update("uuid-nao-existe", { name: "Teste" }),
      ).rejects.toThrow(NotFoundError);
    });
  });

  // --- (Sem alterações) ---
  describe("del", () => {
    it("should delete a scene", async () => {
      const sceneId = "uuid-scene";
      const mockReturn = { id: sceneId };
      database.query.mockResolvedValue({ rows: [mockReturn], rowCount: 1 });

      const result = await scene.del(sceneId);

      expect(database.query).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockReturn);
    });

    it("should throw NotFoundError if scene not found", async () => {
      database.query.mockResolvedValue({ rows: [], rowCount: 0 });
      await expect(scene.del("uuid-nao-existe")).rejects.toThrow(NotFoundError);
    });
  });

  // --- (Refatorado) ---
  describe("findAllFromPresentation", () => {
    it("should fetch details for FORMATION scenes (elements) using the correct JOIN", async () => {
      const presentationId = "uuid-presentation";
      const sceneFormationId = "uuid-scene-formation";
      const sceneTransitionId = "uuid-scene-transition";

      const scenesData = [
        { id: sceneFormationId, scene_type: "FORMATION" },
        { id: sceneTransitionId, scene_type: "TRANSITION" },
      ];
      const elementsData = [
        {
          id: "uuid-element",
          display_name: "Elemento com JOIN",
          assigned_user_id: "uuid-user",
        },
      ];
      const stepsData = [{ id: "uuid-step" }];

      // Configuração do Mock (para 'database.query', não 'client.query')
      database.query.mockImplementation((query) => {
        // 1. Mock da busca de Cenas
        if (query.text.includes("SELECT * FROM scenes WHERE")) {
          return Promise.resolve({ rows: scenesData, rowCount: 2 });
        }

        // 2. Foco da Correção: Mock da busca de Elementos (com JOIN)
        if (
          query.text.includes("scene_elements") &&
          query.text.includes("element_groups") &&
          query.values.includes(sceneFormationId)
        ) {
          return Promise.resolve({ rows: elementsData, rowCount: 1 });
        }

        // 3. Mock da busca de Passos
        if (
          query.text.includes("SELECT * FROM transition_steps WHERE") &&
          query.values.includes(sceneTransitionId)
        ) {
          return Promise.resolve({ rows: stepsData, rowCount: 1 });
        }
        return Promise.resolve({ rows: [], rowCount: 0 });
      });

      const result = await scene.findAllFromPresentation(presentationId);

      // Validar o resultado
      expect(result).toHaveLength(2);
      expect(result[0].elements).toHaveLength(1);
      expect(result[0].elements[0].display_name).toBe("Elemento com JOIN");
      expect(result[1].steps).toHaveLength(1);
    });

    it("should return empty arrays if scene type has no data", async () => {
      // (Seu teste original de "empty array")
      const presentationId = "uuid-presentation";
      const sceneFormationId = "uuid-scene-formation";
      const scenesData = [{ id: sceneFormationId, scene_type: "FORMATION" }];

      database.query.mockImplementation((query) => {
        if (query.text.includes("SELECT * FROM scenes WHERE")) {
          return Promise.resolve({ rows: scenesData, rowCount: 1 });
        }
        return Promise.resolve({ rows: [], rowCount: 0 });
      });

      const result = await scene.findAllFromPresentation(presentationId);

      expect(result).toHaveLength(1);
      expect(result[0].elements).toHaveLength(0);
      expect(result[0].steps).toHaveLength(0);
    });
  });

  // --- NOVO ---
  describe("findById", () => {
    it("should return a scene by id", async () => {
      const sceneId = "uuid-scene-1";
      const mockScene = { id: sceneId, name: "Cena Encontrada" };
      database.query.mockResolvedValue({ rows: [mockScene], rowCount: 1 });

      const result = await scene.findById(sceneId);

      expect(database.query).toHaveBeenCalledTimes(1);
      expect(database.query).toHaveBeenCalledWith({
        text: `SELECT * FROM scenes WHERE id = $1;`,
        values: [sceneId],
      });
      expect(result).toEqual(mockScene);
    });

    it("should return undefined if scene not found", async () => {
      const sceneId = "uuid-nao-existe";
      database.query.mockResolvedValue({ rows: [], rowCount: 0 });

      const result = await scene.findById(sceneId);

      expect(database.query).toHaveBeenCalledTimes(1);
      expect(result).toBeUndefined();
    });
  });

  // --- NOVO (Testes agora devem passar) ---
  describe("clone", () => {
    const targetPresentationId = "uuid-target-pres";
    const newOrder = 2;

    it("should clone a FORMATION scene 'with_users'", async () => {
      const sourceScene = {
        id: "uuid-source-scene",
        name: "Cena Original FORMATION",
        scene_type: "FORMATION",
        description: "Desc original",
        // Dados achatados (como viriam do 'findDeepById')
        scene_elements: [
          {
            group_id: "group-1",
            display_name: "Grupo 1",
            assigned_user_id: "user-A",
            element_type_id: "type-1",
            position_x: 10,
            position_y: 10,
          },
          {
            group_id: "group-1",
            display_name: "Grupo 1",
            assigned_user_id: "user-A",
            element_type_id: "type-2",
            position_x: 20,
            position_y: 20,
          },
        ],
      };
      const pasteOption = "with_users";

      const result = await scene.clone(
        sourceScene,
        targetPresentationId,
        pasteOption,
        newOrder,
      );

      // 1. Validar resultado
      expect(result.id).toBe("uuid-new-scene");
      expect(result.name).toBe("(Cópia) Cena Original FORMATION");

      // 2. Validar transação
      expect(mockClient.query).toHaveBeenCalledWith("BEGIN");

      // 3. Validar criação da cena base
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining("INSERT INTO scenes"),
          values: [
            targetPresentationId,
            newOrder,
            "(Cópia) Cena Original FORMATION",
            "FORMATION",
            "Desc original",
          ],
        }),
      );

      // 4. Validar [Side Effect] (addViewer)
      expect(presentationViewer.addViewer).toHaveBeenCalledTimes(1);
      expect(presentationViewer.addViewer).toHaveBeenCalledWith(
        targetPresentationId,
        "user-A", // ID do usuário do 'scene_elements'
        { useClient: mockClient },
      );

      // 5. Validar clonagem de conteúdo (Groups)
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining("INSERT INTO element_groups"),
          values: [
            "uuid-new-scene",
            "Grupo 1", // display_name (mantido)
            "user-A", // assigned_user_id (mantido)
          ],
        }),
      );

      // 6. Validar clonagem de conteúdo (Elements)
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining("INSERT INTO scene_elements"),
          values: [
            "uuid-new-scene", // scene_id
            "type-1", // element_type_id (el 1)
            "uuid-new-group", // group_id (novo)
            10, // pos_x (el 1)
            10, // pos_y (el 1)
            "uuid-new-scene", // scene_id
            "type-2", // element_type_id (el 2)
            "uuid-new-group", // group_id (novo)
            20, // pos_x (el 2)
            20, // pos_y (el 2)
          ],
        }),
      );

      // 7. Validar Fim
      expect(mockClient.query).toHaveBeenCalledWith("COMMIT");
      expect(mockClient.end).toHaveBeenCalledTimes(1);
    });

    it("should clone a TRANSITION scene 'with_names' (sem usuários)", async () => {
      const sourceScene = {
        id: "uuid-source-scene",
        name: "Cena Original TRANSITION",
        scene_type: "TRANSITION",
        description: null,
        transition_steps: [
          {
            description: "Step 1",
            order: 1,
            assigned_user_id: "user-B",
          },
        ],
      };
      // 'with_names' ou 'default' não devem copiar 'assigned_user_id'
      const pasteOption = "with_names";

      await scene.clone(
        sourceScene,
        targetPresentationId,
        pasteOption,
        newOrder,
      );

      // 1. Validar criação da cena base
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining("INSERT INTO scenes"),
          values: [
            targetPresentationId,
            newOrder,
            "(Cópia) Cena Original TRANSITION",
            "TRANSITION",
            null,
          ],
        }),
      );

      // 2. Validar [Side Effect] (NÃO deve chamar)
      expect(presentationViewer.addViewer).not.toHaveBeenCalled();

      // 3. Validar clonagem de conteúdo (Steps)
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining("INSERT INTO transition_steps"),
          values: [
            "uuid-new-scene", // new scene_id
            "Step 1", // description
            1, // order
            null, // assigned_user_id (deve ser null)
          ],
        }),
      );

      // 4. Validar Fim
      expect(mockClient.query).toHaveBeenCalledWith("COMMIT");
      expect(mockClient.end).toHaveBeenCalledTimes(1);
    });

    it("should ROLLBACK transaction on error", async () => {
      const sourceScene = { id: "uuid-source", scene_type: "FORMATION" };
      const dbError = new Error("Falha ao inserir cena");

      // --- CORREÇÃO APLICADA AQUI TAMBÉM ---
      // Simular falha no primeiro INSERT (cena)
      mockClient.query.mockImplementation((query) => {
        // A mesma proteção é necessária aqui
        if (query && typeof query === "object" && query.text) {
          if (query.text.includes("INSERT INTO scenes")) {
            return Promise.reject(dbError);
          }
        }
        // Permite que 'BEGIN' funcione
        return Promise.resolve({ rows: [], rowCount: 0 });
      });
      // --- FIM DA CORREÇÃO ---

      await expect(
        scene.clone(sourceScene, targetPresentationId, "default", 1),
      ).rejects.toThrow("Falha ao inserir cena");

      // Validar Transação
      expect(mockClient.query).toHaveBeenCalledWith("BEGIN");
      expect(mockClient.query).not.toHaveBeenCalledWith("COMMIT");
      expect(mockClient.query).toHaveBeenCalledWith("ROLLBACK");
      expect(mockClient.end).toHaveBeenCalledTimes(1); // 'finally' deve rodar
      expect(database.handleDatabaseError).toHaveBeenCalledWith(dbError);
    });
  });
});
