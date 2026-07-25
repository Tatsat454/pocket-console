import os from "os";

/** Collect non-internal IPv4 addresses for local-network join instructions. */
export function getLanAddresses(): string[] {
  const nets = os.networkInterfaces();
  const results: string[] = [];
  for (const entries of Object.values(nets)) {
    if (!entries) continue;
    for (const net of entries) {
      const family = String(net.family);
      if ((family === "IPv4" || family === "4") && !net.internal) {
        results.push(net.address);
      }
    }
  }
  return results;
}

export function printHostBanner(port: number): void {
  const addrs = getLanAddresses();
  console.log("\n╔══════════════════════════════════════════════╗");
  console.log("║         Pocket Console — Local Host          ║");
  console.log("╠══════════════════════════════════════════════╣");
  console.log("║ 1. Connect everyone to the same Wi‑Fi/hotspot║");
  console.log("║ 2. This device is hosting the game server    ║");
  console.log("║ 3. Friends open one of these URLs:           ║");
  if (addrs.length === 0) {
    console.log(`║    http://localhost:${port}`.padEnd(47) + "║");
  } else {
    for (const ip of addrs) {
      const line = `║    http://${ip}:${port}`;
      console.log(line.padEnd(47) + "║");
    }
  }
  console.log("║ 4. Create a room and share the room code     ║");
  console.log("╚══════════════════════════════════════════════╝\n");
}
