export async function login(password: string): Promise<string> {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  })
  if (!response.ok) {
    throw new Error('Incorrect password')
  }
  const data = (await response.json()) as { token: string }
  return data.token
}

export async function checkAuth(token: string): Promise<boolean> {
  const response = await fetch('/api/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  })
  return response.ok
}
