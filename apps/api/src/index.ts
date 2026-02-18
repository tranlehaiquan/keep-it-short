import os from "node:os";
import cluster from "node:cluster";
import path from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const numCPUs = Math.min(os.cpus().length, 4);

cluster.setupPrimary({
  exec: __dirname + "/server.js",
});

for (let i = 0; i < numCPUs; i++) {
  cluster.fork();
}

cluster.on("exit", (worker) => {
  console.log(`worker ${worker.process.pid} has been killed`);
});
