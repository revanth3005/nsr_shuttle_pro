// Server-side session helpers. Reads the JWT cookie and resolves the current
// user. Also exposes role-guard helpers used by API routes and server pages.
import { cookies } from "next/headers";
import { verifyToken, TOKEN_COOKIE } from "./jwt.js";
import { findById } from "../excel/store.js";
import { SHEETS, ROLES } from "../excel/schema.js";

export async function getCurrentUser() {
  const store = await cookies();
  const token = store.get(TOKEN_COOKIE)?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  if (!payload?.sub) return null;
  const user = await findById(SHEETS.Users, payload.sub);
  if (!user) return null;
  // Never leak the password hash.
  const { passwordHash, resetToken, resetTokenExpiry, ...safe } = user;
  return safe;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    const err = new Error("Unauthorized");
    err.status = 401;
    throw err;
  }
  return user;
}

export async function requireRole(...roles) {
  const user = await requireUser();
  if (!roles.includes(user.role)) {
    const err = new Error("Forbidden");
    err.status = 403;
    throw err;
  }
  return user;
}

export const isAdmin = (u) => u?.role === ROLES.SUPER_ADMIN;
export const isOrganizer = (u) =>
  u?.role === ROLES.ORGANIZER || u?.role === ROLES.SUPER_ADMIN;
