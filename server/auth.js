import jwt from "jsonwebtoken";
import { config } from "./config.js";
import { Profile, UserRole } from "./models.js";

export function createToken(userId, email, role) {
  return jwt.sign({ userId, email, role }, config.jwtSecret, { expiresIn: "7d" });
}

export function authMiddleware(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const payload = jwt.verify(token, config.jwtSecret);
    req.auth = payload;
    return next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

export async function getUserContext(userId) {
  const [roleDoc, profile] = await Promise.all([
    UserRole.findOne({ user_id: userId }).lean(),
    Profile.findOne({ user_id: userId }).lean(),
  ]);

  return {
    role: roleDoc?.role || null,
    profile: profile || null,
  };
}

