import { z } from "zod";
import { ALLOWED_REACTIONS } from "../src/games/events";

export const roomCreateSchema = z.object({
  gameId: z.string().min(1).max(64),
  displayName: z.string().trim().min(1).max(24),
  avatarId: z.string().min(1).max(32),
  guestId: z.string().max(80).optional(),
  mode: z
    .enum(["solo", "same_device", "private_room", "local_network"])
    .optional(),
});

export const roomJoinSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{4,8}$/, "Invalid room code"),
  displayName: z.string().trim().min(1).max(24),
  avatarId: z.string().min(1).max(32),
  guestId: z.string().max(80).optional(),
});

export const roomReadySchema = z.object({
  ready: z.boolean(),
});

export const roomRejoinSchema = z.object({
  roomId: z.string().min(1).max(80),
  token: z.string().min(8).max(128),
});

export const gameActionSchema = z.object({
  action: z.unknown(),
});

export const reactionSchema = z.object({
  emoji: z
    .string()
    .refine((e) => (ALLOWED_REACTIONS as readonly string[]).includes(e), {
      message: "Reaction not allowed",
    }),
});

export const presenceSchema = z.object({
  guestId: z.string().min(1).max(80),
  displayName: z.string().trim().min(1).max(24),
  avatarId: z.string().min(1).max(32),
});
