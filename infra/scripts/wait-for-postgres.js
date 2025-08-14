const { exec } = require("node:child_process");

function waitForConnection() {
  exec("docker exec postgres-dev pg_isready --host localhost", callback);

  function callback(erro, stdout) {
    if (stdout.search("accepting connections") === -1) {
      process.stdout.write("|");
      waitForConnection();
      return;
    }
    console.log("\n🟢 Postgres está pronto e aceitando conexões!\n");
  }
}

console.log("🔴 Aguardando Postgres aceitar conexões");
waitForConnection();
