import { z } from 'zod';

// Replicating the schema from login/route.ts to test validation logic
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

describe('Auth Login Validation', () => {
  it('should reject invalid email', () => {
    const result = loginSchema.safeParse({ email: 'invalid', password: '123456' });
    expect(result.success).toBe(false);
  });

  it('should reject short passwords', () => {
    const result = loginSchema.safeParse({ email: 'test@test.com', password: '123' });
    expect(result.success).toBe(false);
  });

  it('should accept valid credentials format', () => {
    const result = loginSchema.safeParse({ email: 'test@test.com', password: '123456' });
    expect(result.success).toBe(true);
  });
});
