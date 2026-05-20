/**
 * User Management API — app/api/users/route.ts
 * Admin only: create, update, delete users
 */

import { NextRequest, NextResponse } from 'next/server';
import { db }          from '../../../lib/db';
import { verifyToken } from '../../../lib/auth';
import { cookies }     from 'next/headers';
import bcrypt          from 'bcryptjs';

// ── Auth helper ───────────────────────────────────────────────────────────────
async function getAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  if (!token) return null;
  const user = await verifyToken(token);
  if (!user || user.role !== 'ADMIN') return null;
  return user;
}

// ── GET — fetch all users ─────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

  try {
    const [rows]: any = await db.query(`
      SELECT id, name, email, role, created_at
      FROM users
      ORDER BY role ASC, name ASC
    `);
    return NextResponse.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: 'Failed to fetch users' }, { status: 500 });
  }
}

// ── POST — create new user ────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

  try {
    const { name, email, password, role } = await req.json();

    if (!name || !email || !password || !role) {
      return NextResponse.json({ success: false, message: 'All fields are required' }, { status: 400 });
    }

    if (!['ADMIN', 'MANAGER', 'SALES'].includes(role)) {
      return NextResponse.json({ success: false, message: 'Invalid role' }, { status: 400 });
    }

    // Check duplicate email
    const [existing]: any = await db.query(`SELECT id FROM users WHERE email = ?`, [email]);
    if (existing.length > 0) {
      return NextResponse.json({ success: false, message: 'Email already exists' }, { status: 400 });
    }

    const hash = await bcrypt.hash(password, 10);
    await db.query(
      `INSERT INTO users (name, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, NOW())`,
      [name, email, hash, role]
    );

    return NextResponse.json({ success: true, message: 'User created successfully' });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: 'Failed to create user' }, { status: 500 });
  }
}

// ── PUT — update user (name, email, role, password) ──────────────────────────
export async function PUT(req: NextRequest) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

  try {
    const { id, name, email, role, password } = await req.json();

    if (!id) return NextResponse.json({ success: false, message: 'User ID required' }, { status: 400 });

    // Check user exists
    const [existing]: any = await db.query(`SELECT id, role FROM users WHERE id = ?`, [id]);
    if (existing.length === 0) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    // Prevent admin from deleting themselves
    if (existing[0].role === 'ADMIN' && role && role !== 'ADMIN') {
      return NextResponse.json({ success: false, message: 'Cannot change Admin role' }, { status: 400 });
    }

    // Check duplicate email (exclude self)
    if (email) {
      const [dup]: any = await db.query(`SELECT id FROM users WHERE email = ? AND id != ?`, [email, id]);
      if (dup.length > 0) {
        return NextResponse.json({ success: false, message: 'Email already in use' }, { status: 400 });
      }
    }

    // Build dynamic update query
    const fields: string[] = [];
    const values: any[]    = [];

    if (name)     { fields.push('name = ?');          values.push(name); }
    if (email)    { fields.push('email = ?');         values.push(email); }
    if (role)     { fields.push('role = ?');          values.push(role); }
    if (password) {
      const hash = await bcrypt.hash(password, 10);
      fields.push('password_hash = ?');
      values.push(hash);
    }

    if (fields.length === 0) {
      return NextResponse.json({ success: false, message: 'Nothing to update' }, { status: 400 });
    }

    values.push(id);
    await db.query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);

    return NextResponse.json({ success: true, message: 'User updated successfully' });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: 'Failed to update user' }, { status: 500 });
  }
}

// ── DELETE — delete user ──────────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ success: false, message: 'User ID required' }, { status: 400 });

    // Prevent self-delete
    if (id === admin.id) {
      return NextResponse.json({ success: false, message: 'Cannot delete your own account' }, { status: 400 });
    }

    const [existing]: any = await db.query(`SELECT id, role FROM users WHERE id = ?`, [id]);
    if (existing.length === 0) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    // Reassign sales to admin before deleting
    await db.query(`UPDATE sales SET user_id = ? WHERE user_id = ?`, [admin.id, id]);
    await db.query(`DELETE FROM users WHERE id = ?`, [id]);

    return NextResponse.json({ success: true, message: 'User deleted successfully' });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: 'Failed to delete user' }, { status: 500 });
  }
}