/**
 * Pocket Console host process.
 * Serves Next.js and Socket.IO on one port so local-network friends
 * only need a single URL (http://<lan-ip>:<port>).
 */
import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { Server } from "socket.io";
import { registerSocketHandlers } from "./socket";
import { printHostBanner, getLanAddresses } from "./network";

const dev = process.env.NODE_ENV !== "production";
const hostname = "0.0.0.0";
const port = parseInt(process.env.PORT || "3000", 10);
const isHostMode =
  process.argv.includes("--host") || process.env.POCKET_HOST === "1";

async function main() {
  const app = next({ dev, hostname, port });
  const handle = app.getRequestHandler();
  await app.prepare();

  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    // Tiny health endpoint for LAN checks
    if (parsedUrl.pathname === "/api/host-info") {
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          ok: true,
          addresses: getLanAddresses(),
          port,
          hostMode: isHostMode,
        }),
      );
      return;
    }
    handle(req, res, parsedUrl);
  });

  const io = new Server(httpServer, {
    path: "/socket.io",
    cors: {
      origin: true,
      methods: ["GET", "POST"],
    },
    // Helpful on flaky mobile hotspots
    pingInterval: 10000,
    pingTimeout: 20000,
  });

  registerSocketHandlers(io, port);

  httpServer.listen(port, hostname, () => {
    console.log(`> Pocket Console ready on http://localhost:${port}`);
    if (isHostMode || true) {
      printHostBanner(port);
    }
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
