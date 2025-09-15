import "server-only"
import jwt from "jsonwebtoken"

export type JWTPayload = {
  id: number
  nome: string
  email: string
  tipo: string
  bloco: string
  apto?: string
  apartamento?: string
}

export const JWT_SECRET = process.env.JWT_SECRET || "FatePackDevSecret123!"

export function signToken(payload: JWTPayload, expiresIn = "2h") {
  return jwt.sign(payload, JWT_SECRET, { expiresIn })
}

export function getUserFromRequest(req: Request): JWTPayload | null {
  const a = req.headers.get("authorization") || ""
  if (!a.startsWith("Bearer ")) return null
  try {
    return jwt.verify(a.slice(7), JWT_SECRET) as JWTPayload
  } catch {
    return null
  }
}