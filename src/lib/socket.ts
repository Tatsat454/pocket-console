"use client";

import { io, type Socket } from "socket.io-client";

let socket: Socket | null = null;

/**
 * Singleton Socket.IO client.
 * Same origin by default so local-network hosting "just works"
 * when friends open the host's LAN URL.
 */
export function getSocket(): Socket {
  if (typeof window === "undefined") {
    throw new Error("Socket is browser-only");
  }
  if (!socket) {
    const url = process.env.NEXT_PUBLIC_SOCKET_URL || undefined;
    socket = io(url, {
      path: "/socket.io",
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 20,
      reconnectionDelay: 500,
      transports: ["websocket", "polling"],
    });
  }
  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}
