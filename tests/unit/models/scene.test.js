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

  // Mock do comportamento padrão das queries dentro do clone
  const setupCloneMocks = () => {
    mockClient.query.mockImplementation((query) => {
      if (!query) return Promise.resolve({ rows: [], rowCount: 0 });

      // Strings simples (BEGIN, COMMIT, ROLLBACK)
      if (typeof query === "string")
        return Promise.resolve({ rows: [], rowCount: 0 });

      // Queries com objetos
      if (query.text) {
        if (query.text.includes("INSERT INTO scenes")) {
          return Promise.resolve({
            rows: [{ id: "uuid-new-scene" }],
            rowCount: 1,
          });
        }
        if (query.text.includes("INSERT INTO element_groups")) {
          return Promise.resolve({
            rows: [{ id: "uuid-new-group" }],
            rowCount: 1,
          });
        }
        if (query.text.includes("INSERT INTO transition_steps")) {
          return Promise.resolve({
            rows: [{ id: "uuid-new-step" }],
            rowCount: 1,
          });
        }
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    validator.mockImplementation((data) => data);

    // Configuração do mock de transação
    mockClient = {
      query: jest.fn(),
      end: jest.fn(),
      release: jest.fn(),
    };
    database.getNewClient.mockResolvedValue(mockClient);

    // Mock padrão do Database Query (Sem transação)
    database.query = jest.fn().mockResolvedValue({ rows: [], rowCount: 0 });

    // Aplica o mock padrão para os testes de clone
    setupCloneMocks();
  });

  describe("findAllFromPresentation()", () => {
    it("should return scenes populated with assignees", async () => {
      database.query
        .mockResolvedValueOnce({
          rows: [{ id: "s1", scene_type: "FORMATION" }],
        })
        .mockResolvedValueOnce({
          rows: [{ id: "el1", assignees: ["u1"] }],
        });

      const result = await scene.findAllFromPresentation("pres1");
      expect(result).toHaveLength(1);
      expect(result[0].elements[0].assignees).toEqual(["u1"]);
    });
  });

  describe("findById()", () => {
    it("should return a scene", async () => {
      database.query.mockResolvedValue({ rows: [{ id: "s1" }] });
      const result = await scene.findById("s1");
      expect(result).toEqual({ id: "s1" });
    });
  });

  describe("create()", () => {
    it("should create a scene", async () => {
      database.query.mockResolvedValue({ rows: [{ id: "new" }] });
      const res = await scene.create({ name: "Test" });
      expect(res.id).toBe("new");
    });
  });

  describe("update()", () => {
    it("should update a scene", async () => {
      database.query.mockResolvedValue({ rows: [{ id: "s1" }], rowCount: 1 });
      await scene.update("s1", { name: "Up" });
      expect(database.query).toHaveBeenCalled();
    });
    it("should throw NotFoundError if not found", async () => {
      database.query.mockResolvedValue({ rows: [], rowCount: 0 });
      await expect(scene.update("x", { name: "X" })).rejects.toThrow(
        NotFoundError,
      );
    });
  });

  describe("del()", () => {
    it("should delete a scene", async () => {
      database.query.mockResolvedValue({ rows: [{ id: "s1" }], rowCount: 1 });
      await scene.del("s1");
      expect(database.query).toHaveBeenCalled();
    });
    it("should throw NotFoundError if not found", async () => {
      database.query.mockResolvedValue({ rows: [], rowCount: 0 });
      await expect(scene.del("x")).rejects.toThrow(NotFoundError);
    });
  });

  describe("checkSceneViewer()", () => {
    it("should return true if authorized", async () => {
      database.query.mockResolvedValue({ rows: [{ id: "p1" }], rowCount: 1 });
      const result = await scene.checkSceneViewer("s1", "u1");
      expect(result).toBe(true);
    });

    it("should throw NotFoundError if unauthorized", async () => {
      database.query.mockResolvedValue({ rows: [], rowCount: 0 });
      await expect(scene.checkSceneViewer("s1", "u1")).rejects.toThrow(
        NotFoundError,
      );
    });
  });

  describe("clone()", () => {
    const targetPresentationId = "uuid-target-pres";

    it("should clone a FORMATION scene (with_users) including assignees", async () => {
      const sourceScene = {
        id: "src",
        scene_type: "FORMATION",
        scene_elements: [
          {
            group_id: "g1",
            assignees: ["u1"],
            element_type_id: "t1",
            position_x: 0,
            position_y: 0,
          },
        ],
      };
      await scene.clone(sourceScene, targetPresentationId, "with_users", 1);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining("INSERT INTO element_group_assignees"),
          values: ["uuid-new-group", "u1"],
        }),
      );
      expect(presentationViewer.addViewer).toHaveBeenCalled();
    });

    it("should clone a TRANSITION scene (with_users) including assignees", async () => {
      const sourceScene = {
        id: "src",
        scene_type: "TRANSITION",
        transition_steps: [
          { description: "desc", order: 1, assignees: ["u1", "u2"] },
        ],
      };
      await scene.clone(sourceScene, targetPresentationId, "with_users", 1);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining(
            "INSERT INTO transition_step_assignees",
          ),
          values: ["uuid-new-step", "u1", "u2"],
        }),
      );
    });

    it("should clone with 'elements_only'", async () => {
      const sourceScene = {
        id: "src",
        scene_type: "FORMATION",
        scene_elements: [
          { group_id: "g1", assignees: ["u1"], display_name: "Nome" },
        ],
      };
      await scene.clone(sourceScene, targetPresentationId, "elements_only", 1);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining("INSERT INTO element_groups"),
          values: ["uuid-new-scene", null],
        }),
      );
      expect(mockClient.query).not.toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining("INSERT INTO element_group_assignees"),
        }),
      );
    });

    it("should clone with 'with_names'", async () => {
      const sourceScene = {
        id: "src",
        scene_type: "FORMATION",
        scene_elements: [
          { group_id: "g1", assignees: ["u1"], display_name: "Nome" },
        ],
      };
      await scene.clone(sourceScene, targetPresentationId, "with_names", 1);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining("INSERT INTO element_groups"),
          values: ["uuid-new-scene", "Nome"],
        }),
      );
      expect(mockClient.query).not.toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining("INSERT INTO element_group_assignees"),
        }),
      );
    });

    it("should ROLLBACK transaction on error", async () => {
      const dbError = new Error("Falha SQL");
      const sourceScene = {
        id: "src",
        scene_type: "FORMATION",
        scene_elements: [],
      };

      // --- SOBRESCRITA COM LOGS ---
      mockClient.query.mockImplementation((query) => {
        // LOG: Veja o que está chegando aqui
        console.log(
          "[TEST LOG] mockClient.query called with:",
          JSON.stringify(query, null, 2),
        );

        if (query === "BEGIN")
          return Promise.resolve({ rows: [], rowCount: 0 });
        if (query === "ROLLBACK")
          return Promise.resolve({ rows: [], rowCount: 0 });

        if (query && query.text) {
          if (query.text.includes("INSERT INTO scenes")) {
            // LOG: Confirmando que entrou no bloco de erro
            console.log("[TEST LOG] Simulating Error on INSERT INTO scenes");
            return Promise.reject(dbError);
          }
          // Para evitar loops infinitos ou erros inesperados em outras queries
          return Promise.resolve({
            rows: [{ id: "default-mock-id" }],
            rowCount: 1,
          });
        }
        return Promise.resolve({ rows: [], rowCount: 0 });
      });

      await expect(
        scene.clone(sourceScene, targetPresentationId, "with_users", 1),
      ).rejects.toThrow("Falha SQL");

      expect(mockClient.query).toHaveBeenCalledWith("BEGIN");
      expect(mockClient.query).toHaveBeenCalledWith("ROLLBACK");
      expect(mockClient.end).toHaveBeenCalled();
    });
  });
});
