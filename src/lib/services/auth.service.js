import bcrypt from "bcryptjs";
import { readSheet, insertRow, updateRow, findById } from "../excel/store.js";
import { SHEETS, ROLES } from "../excel/schema.js";
import { genId, nowIso } from "../utils.js";
import { signToken } from "../auth/jwt.js";
import { logAudit } from "./audit.service.js";
import { createPlayerForUser } from "./player.service.js";

function sanitize(user) {
  if (!user) return null;
  const { passwordHash, resetToken, resetTokenExpiry, ...safe } = user;
  return safe;
}

export async function getUserByEmail(email) {
  const e = String(email || "").toLowerCase().trim();
  const users = await readSheet(SHEETS.Users);
  return users.find((u) => String(u.email).toLowerCase() === e) || null;
}

export async function register({ email, password, name, role, playerFields }) {
  if (await getUserByEmail(email)) {
    const err = new Error("An account with this email already exists");
    err.status = 409;
    throw err;
  }
  const requestedRole = Object.values(ROLES).includes(role) ? role : ROLES.PLAYER;
  const id = genId("USR");
  const passwordHash = await bcrypt.hash(password, 10);

  // Every player-role signup gets a linked Player profile.
  let playerId = "";
  if (requestedRole === ROLES.PLAYER) {
    const player = await createPlayerForUser({ email, name, ...(playerFields || {}) });
    playerId = player.id;
  }

  const user = {
    id,
    email: String(email).toLowerCase().trim(),
    passwordHash,
    name,
    role: requestedRole,
    playerId,
    resetToken: "",
    resetTokenExpiry: "",
    createdAt: nowIso(),
  };
  await insertRow(SHEETS.Users, user);
  await logAudit({ userId: id, userName: name, action: "USER_REGISTER", entity: "User", details: { email, role: requestedRole } });
  return sanitize(user);
}

export async function login({ email, password }) {
  const user = await getUserByEmail(email);
  if (!user) {
    const err = new Error("Invalid email or password");
    err.status = 401;
    throw err;
  }
  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) {
    const err = new Error("Invalid email or password");
    err.status = 401;
    throw err;
  }
  const token = await signToken({ sub: user.id, role: user.role, name: user.name });
  await logAudit({ userId: user.id, userName: user.name, action: "USER_LOGIN", entity: "User" });
  return { token, user: sanitize(user) };
}

export async function changePassword(userId, { currentPassword, newPassword }) {
  const user = await findById(SHEETS.Users, userId);
  if (!user) {
    const err = new Error("User not found");
    err.status = 404;
    throw err;
  }
  const match = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!match) {
    const err = new Error("Current password is incorrect");
    err.status = 400;
    throw err;
  }
  const passwordHash = await bcrypt.hash(newPassword, 10);
  await updateRow(SHEETS.Users, userId, { passwordHash });
  await logAudit({ userId, userName: user.name, action: "PASSWORD_CHANGE", entity: "User" });
  return true;
}

// Forgot password: generate a reset token. In a real deployment this would be
// emailed; here we return it so the flow is demonstrable without a mail server.
export async function requestPasswordReset(email) {
  const user = await getUserByEmail(email);
  if (!user) return { token: null }; // Do not reveal whether the email exists.
  const token = genId("RST");
  const expiry = new Date(Date.now() + 1000 * 60 * 30).toISOString(); // 30 min
  await updateRow(SHEETS.Users, user.id, { resetToken: token, resetTokenExpiry: expiry });
  return { token, email: user.email };
}

export async function resetPassword({ email, token, newPassword }) {
  const user = await getUserByEmail(email);
  if (!user || !user.resetToken || String(user.resetToken) !== String(token)) {
    const err = new Error("Invalid or expired reset token");
    err.status = 400;
    throw err;
  }
  if (new Date(user.resetTokenExpiry).getTime() < Date.now()) {
    const err = new Error("Reset token has expired");
    err.status = 400;
    throw err;
  }
  const passwordHash = await bcrypt.hash(newPassword, 10);
  await updateRow(SHEETS.Users, user.id, { passwordHash, resetToken: "", resetTokenExpiry: "" });
  await logAudit({ userId: user.id, userName: user.name, action: "PASSWORD_RESET", entity: "User" });
  return true;
}

export async function listUsers() {
  const users = await readSheet(SHEETS.Users);
  return users.map(sanitize);
}
