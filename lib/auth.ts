import { SignJWT, jwtVerify } from 'jose';

export type UserRole = 'ADMIN' | 'MANAGER' | 'SALES';

export type AuthUser = {
  id: number;
  name: string;
  email: string;
  role: UserRole;
};

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || 'fallback_secret_key'
);

export async function createToken(user: AuthUser) {
  return new SignJWT({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1d')
    .sign(secret);
}

export async function verifyToken(token: string): Promise<AuthUser | null> {
  try {
    const { payload } = await jwtVerify(token, secret);

    return {
      id: Number(payload.id),
      name: String(payload.name),
      email: String(payload.email),
      role: payload.role as UserRole,
    };
  } catch {
    return null;
  }
}