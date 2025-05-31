// src/utils/apiClient.ts

const API_BASE_URL = 'http://localhost:8000/api/v1'; // Pastikan ini sama

// Fungsi ini akan digunakan oleh method di bawah, jadi tidak akan error 'unused'
const getAuthHeaders = () => {
  const token = localStorage.getItem('authToken');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Token ${token}`;
  }
  return headers;
};

// Pastikan Anda mengekspor apiClient agar bisa digunakan di file lain
export const apiClient = {
  get: async (endpoint: string) => { // 'endpoint' digunakan di sini
    const response = await fetch(`${API_BASE_URL}${endpoint}`, { // API_BASE_URL digunakan
      headers: getAuthHeaders(), // getAuthHeaders digunakan
    });
    if (!response.ok) throw new Error(`API GET ${API_BASE_URL}${endpoint} failed: ${response.statusText}`);
    if (response.status === 204) return null; // Handle No Content
    return response.json().catch(() => null); // Handle empty JSON response
  },
  post: async (endpoint: string, body: any) => { // 'endpoint' dan 'body' digunakan
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(body),
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: `API POST ${API_BASE_URL}${endpoint} failed: ${response.statusText}` }));
        throw new Error(errorData.detail || JSON.stringify(errorData));
    }
    if (response.status === 204) return null;
    return response.json().catch(() => null);
  },
  patch: async (endpoint: string, body: any) => { // 'endpoint' dan 'body' digunakan
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(body),
    });
     if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: `API PATCH ${API_BASE_URL}${endpoint} failed: ${response.statusText}` }));
        throw new Error(errorData.detail || JSON.stringify(errorData));
    }
    if (response.status === 204) return null;
    return response.json().catch(() => null);
  },
  delete: async (endpoint: string) => { // 'endpoint' digunakan
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!response.ok && response.status !== 204) { // 204 No Content juga dianggap ok untuk DELETE
        const errorData = await response.json().catch(() => ({ detail: `API DELETE ${API_BASE_URL}${endpoint} failed: ${response.statusText}` }));
        throw new Error(errorData.detail || JSON.stringify(errorData));
    }
    // Tidak ada body yang diharapkan dari DELETE, jadi return null atau respons status
    return null; 
  },
};