export interface PasswordCheck {
  label: string;
  passed: boolean;
}

export interface PasswordStrength {
  label: 'Weak' | 'Fair' | 'Strong';
  color: string;
  ratio: number;
}

/** The 4 rules shown on Sign Up, Reset Password and Accept Invitation (design's RULES constant). */
export function checklistFor(password: string): PasswordCheck[] {
  return [
    { label: 'At least 8 characters', passed: password.length >= 8 },
    { label: 'One uppercase letter', passed: /[A-Z]/.test(password) },
    { label: 'One lowercase letter', passed: /[a-z]/.test(password) },
    { label: 'One number', passed: /[0-9]/.test(password) }
  ];
}

export function strengthFor(checks: PasswordCheck[]): PasswordStrength {
  const passed = checks.filter((c) => c.passed).length;
  if (passed <= 1) return { label: 'Weak', color: 'bg-error-500', ratio: 0.33 };
  if (passed <= 3) return { label: 'Fair', color: 'bg-warning-500', ratio: 0.66 };
  return { label: 'Strong', color: 'bg-success-500', ratio: 1 };
}
