import { v4 as uuid } from 'uuid';

export interface User {
  id: string;
  email: string;
  password: string; // NOTE: In production never store plain passwords. Use hashing.
  name: string;
  role: 'admin' | 'pharmacist' | 'cashier';
}

const USERS_STORAGE_KEY = 'pharmacy_users';

export const getUsers = (): User[] => {
  const raw = localStorage.getItem(USERS_STORAGE_KEY);
  return raw ? (JSON.parse(raw) as User[]) : [];
};

export const saveUsers = (users: User[]): void => {
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
};

export const authenticateUser = (
  email: string,
  password: string,
): User | null => {
  const normalizedEmail = email?.trim().toLowerCase();

  if (!normalizedEmail) return null;

  // Filter out any corrupted objects that may not have the required fields
  const validUsers = getUsers().filter(
    u => typeof u?.email === 'string' && typeof u?.password === 'string',
  );

  return (
    validUsers.find(
      u => u.email.trim().toLowerCase() === normalizedEmail && u.password === password,
    ) || null
  );
};
