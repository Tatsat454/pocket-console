import { NextResponse } from "next/server";
import os from "os";

function getLanAddresses(): string[] {
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

export async function GET() {
  return NextResponse.json({
    ok: true,
    addresses: getLanAddresses(),
    port: parseInt(process.env.PORT || "3000", 10),
    hostMode: process.env.POCKET_HOST === "1",
  });
}
