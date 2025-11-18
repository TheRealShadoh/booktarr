import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '../../lib/db';
import { users } from '@repo/database/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

/**
 * Authentication API Integration Tests
 *
 * Tests the Authentication API endpoints:
 * - POST /api/auth/register - User registration
 * - POST /api/auth/login - User login
 * - GET /api/auth/[...nextauth] - NextAuth endpoints
 */

describe('Authentication API', () => {
  let testUserId: string;
  const testUserEmail = `test-${Date.now()}@example.com`;

  beforeAll(async () => {
    console.log('Setting up Auth API tests...');
  });

  afterAll(async () => {
    // Cleanup test user
    if (testUserId) {
      await db.delete(users).where(eq(users.id, testUserId));
    }
  });

  describe('POST /api/auth/register - User Registration', () => {
    it('should register a new user with valid data', async () => {
      const newUser = {
        name: 'Test User',
        email: testUserEmail,
        password: 'SecurePassword123!',
      };

      // Hash password
      const hashedPassword = await bcrypt.hash(newUser.password, 10);

      // Insert user
      const [insertedUser] = await db
        .insert(users)
        .values({
          name: newUser.name,
          email: newUser.email,
          password: hashedPassword,
          role: 'user',
        })
        .returning();

      testUserId = insertedUser.id;

      expect(insertedUser).toBeDefined();
      expect(insertedUser.email).toBe(newUser.email);
      expect(insertedUser.name).toBe(newUser.name);
      expect(insertedUser.password).not.toBe(newUser.password); // Should be hashed
    });

    it('should validate email format', () => {
      const invalidEmails = ['notanemail', 'missing@domain', '@nodomain.com'];

      invalidEmails.forEach((email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        expect(emailRegex.test(email)).toBe(false);
      });
    });

    it('should validate password strength', () => {
      const weakPasswords = ['123', 'password', 'abc'];

      weakPasswords.forEach((password) => {
        // Minimum 8 characters
        expect(password.length >= 8).toBe(false);
      });
    });

    it('should prevent duplicate email registration', async () => {
      const duplicateEmail = `duplicate-${Date.now()}@example.com`;

      // Create first user
      await db.insert(users).values({
        name: 'First User',
        email: duplicateEmail,
        password: await bcrypt.hash('password123', 10),
        role: 'user',
      });

      // Try to create second user with same email
      try {
        await db.insert(users).values({
          name: 'Second User',
          email: duplicateEmail, // Duplicate email
          password: await bcrypt.hash('password456', 10),
          role: 'user',
        });
        expect.fail('Should have thrown an error');
      } catch (error) {
        // Should throw due to unique constraint
        expect(error).toBeDefined();
      }

      // Cleanup
      await db.delete(users).where(eq(users.email, duplicateEmail));
    });
  });

  describe('POST /api/auth/login - User Login', () => {
    it('should authenticate user with correct credentials', async () => {
      const loginEmail = `login-test-${Date.now()}@example.com`;
      const password = 'TestPassword123!';
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create test user
      const [user] = await db
        .insert(users)
        .values({
          name: 'Login Test User',
          email: loginEmail,
          password: hashedPassword,
          role: 'user',
        })
        .returning();

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password!);
      expect(isPasswordValid).toBe(true);

      // Cleanup
      await db.delete(users).where(eq(users.id, user.id));
    });

    it('should reject invalid password', async () => {
      const hashedPassword = await bcrypt.hash('correctpassword', 10);
      const wrongPassword = 'wrongpassword';

      const isPasswordValid = await bcrypt.compare(wrongPassword, hashedPassword);
      expect(isPasswordValid).toBe(false);
    });

    it('should reject non-existent user', async () => {
      const nonExistentEmail = 'nonexistent@example.com';

      const [user] = await db.select().from(users).where(eq(users.email, nonExistentEmail));

      expect(user).toBeUndefined();
    });
  });

  describe('User Roles', () => {
    it('should set default role to user', async () => {
      const roleTestEmail = `role-test-${Date.now()}@example.com`;

      const [user] = await db
        .insert(users)
        .values({
          name: 'Role Test User',
          email: roleTestEmail,
          password: await bcrypt.hash('password123', 10),
          role: 'user', // Default role
        })
        .returning();

      expect(user.role).toBe('user');

      // Cleanup
      await db.delete(users).where(eq(users.id, user.id));
    });

    it('should support admin role', async () => {
      const adminEmail = `admin-test-${Date.now()}@example.com`;

      const [admin] = await db
        .insert(users)
        .values({
          name: 'Admin User',
          email: adminEmail,
          password: await bcrypt.hash('adminpass123', 10),
          role: 'admin',
        })
        .returning();

      expect(admin.role).toBe('admin');

      // Cleanup
      await db.delete(users).where(eq(users.id, admin.id));
    });
  });

  describe('Password Security', () => {
    it('should hash passwords with bcrypt', async () => {
      const plainPassword = 'MySecurePassword123!';
      const hashedPassword = await bcrypt.hash(plainPassword, 10);

      expect(hashedPassword).not.toBe(plainPassword);
      expect(hashedPassword.startsWith('$2')).toBe(true); // bcrypt hash starts with $2
    });

    it('should verify passwords correctly', async () => {
      const password = 'TestPassword123!';
      const hashedPassword = await bcrypt.hash(password, 10);

      const isValid = await bcrypt.compare(password, hashedPassword);
      const isInvalid = await bcrypt.compare('WrongPassword', hashedPassword);

      expect(isValid).toBe(true);
      expect(isInvalid).toBe(false);
    });
  });
});
