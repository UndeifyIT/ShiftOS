import { describe, it, expect } from 'vitest';
import { APP_ROUTES } from '@shiftos/constants';

describe('APP_ROUTES', () => {
  it('includes the known dashboard/operational routes', () => {
    for (const path of ['/', '/schedules', '/employees', '/tasks', '/attendance', '/announcements', '/requests']) {
      expect(APP_ROUTES).toContain(path);
    }
  });

  it('does not include an external or made-up path', () => {
    expect(APP_ROUTES).not.toContain('https://evil.example.com');
    expect(APP_ROUTES).not.toContain('/not-a-real-route');
  });
});
