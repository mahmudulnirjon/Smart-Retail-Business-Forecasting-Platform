import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '../../../../lib/db';
import { createToken } from '../../../../lib/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = String(body.email || '').trim();
    const password = String(body.password || '');

    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: 'Email and password are required' },
        { status: 400 }
      );
    }

    const [rows]: any = await db.query(
      `
      SELECT id, name, email, password_hash, role
      FROM users
      WHERE email = ?
      LIMIT 1
      `,
      [email]
    );

    const user = rows[0];

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Invalid email or password' },
        { status: 401 }
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, message: 'Invalid email or password' },
        { status: 401 }
      );
    }

    const authUser = {
      id: Number(user.id),
      name: user.name,
      email: user.email,
      role: user.role,
    };

    const token = await createToken(authUser);

    const response = NextResponse.json({
      success: true,
      message: 'Login successful',
      user: authUser,
    });

    response.cookies.set('auth_token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      path: '/',
      maxAge: 60 * 60 * 24,
    });

    return response;
  } catch (error) {
    console.error('Login Error:', error);

    return NextResponse.json(
      { success: false, message: 'Login failed' },
      { status: 500 }
    );
  }
}