const nextJest = require("next/jest");
const dotenv = require("dotenv");
dotenv.config({
  path: ".env.development",
});

const jestConfigRunner = nextJest({ dir: "." });
const jestConfig = jestConfigRunner({
  moduleDirectories: ["node_modules", "<rootDir>"],
  testTimeout: 60000,
});

module.exports = jestConfig;
