import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '../../../../lib/db';

export async function GET() {
  try {
    const users = [
      {
        name: 'Admin User',
        email: 'admin@smartretail.com',
        password: 'admin123',
        role: 'ADMIN',
      },
      {
        name: 'Manager User',
        email: 'manager@smartretail.com',
        password: 'manager123',
        role: 'MANAGER',
      },
      {
        name: 'Sales Employee',
        email: 'sales@smartretail.com',
        password: 'sales123',
        role: 'SALES',
      },
    ];

    for (const user of users) {
      const passwordHash = await bcrypt.hash(user.password, 10);

      await db.query(
        `
        INSERT INTO users (name, email, password_hash, role)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          name = VALUES(name),
          password_hash = VALUES(password_hash),
          role = VALUES(role)
        `,
        [user.name, user.email, passwordHash, user.role]
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Demo users created successfully',
      users: [
        { email: 'admin@smartretail.com', password: 'admin123', role: 'ADMIN' },
        { email: 'manager@smartretail.com', password: 'manager123', role: 'MANAGER' },
        { email: 'sales@smartretail.com', password: 'sales123', role: 'SALES' },
      ],
    });
  } catch (error) {
    console.error('Seed Error:', error);

    return NextResponse.json(
      { success: false, message: 'Failed to seed users' },
      { status: 500 }
    );
  }
}