/**
 * Password validation rules matching the official problem statement:
 * - More than 8 characters (minimum 9 characters)
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one special character
 */

export interface PasswordCriterion {
  id: string;
  label: string;
  isValid: boolean;
}

export function validatePasswordCriteria(password: string): PasswordCriterion[] {
  return [
    {
      id: 'length',
      label: 'More than 8 characters (9+)',
      isValid: password.length > 8,
    },
    {
      id: 'uppercase',
      label: 'At least one uppercase letter (A-Z)',
      isValid: /[A-Z]/.test(password),
    },
    {
      id: 'lowercase',
      label: 'At least one lowercase letter (a-z)',
      isValid: /[a-z]/.test(password),
    },
    {
      id: 'special',
      label: 'At least one special character (!@#$%^&*)',
      isValid: /[^a-zA-Z0-9]/.test(password),
    },
  ];
}

export function isPasswordValid(password: string): boolean {
  const criteria = validatePasswordCriteria(password);
  return criteria.every((c) => c.isValid);
}

