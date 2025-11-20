const API_URL = '/api/pharmacy/users';

export async function getUsers() {
  const res = await fetch(API_URL);
  if (!res.ok) throw new Error('Failed to fetch users');
  return res.json();
}

export async function getUserById(id: string) {
  const res = await fetch(`${API_URL}/${id}`);
  if (!res.ok) throw new Error('Failed to fetch user');
  return res.json();
}

export async function createUser(data: { username: string; password: string; role: string }) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create user');
  return res.json();
}

export async function updateUser(id: string, data: { username?: string; password?: string; role?: string }) {
  const res = await fetch(`${API_URL}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update user');
  return res.json();
}

export async function deleteUser(id: string) {
  const res = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete user');
  return res.json();
}

export async function loginUser(username: string, password: string) {
  const res = await fetch(`${API_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.message || 'Login failed');
  }
  return res.json();
}