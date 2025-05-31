// src/utils/apiClient.ts

const API_BASE_URL = 'http://localhost:8000/api/v1'; // Pastikan ini adalah URL backend Anda

interface ApiErrorData {
  detail?: string;
  [key: string]: any; // Untuk menampung error field-specific dari Django REST Framework
}

interface ApiError extends Error {
  response?: {
    data: ApiErrorData;
    status: number;
  };
}

// Fungsi helper untuk mendapatkan header autentikasi
// Sekarang menerima argumen untuk menentukan apakah body adalah FormData
const getAuthHeaders = (isFormData: boolean = false): HeadersInit => {
  const token = localStorage.getItem('authToken');
  const headers: HeadersInit = {}; // Headers yang bisa dimodifikasi

  if (!isFormData) {
    // Hanya set Content-Type ke application/json jika BUKAN FormData
    // Untuk FormData, browser akan otomatis mengatur Content-Type yang benar (multipart/form-data beserta boundary)
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Token ${token}`; // Sesuaikan jika Anda menggunakan Bearer token (JWT)
  }
  return headers;
};

// Helper untuk memproses respons
async function handleResponse(response: Response, endpoint: string, method: string) {
  const responseStatus = response.status;
  let responseDataText = '';
  try {
    responseDataText = await response.text(); // Baca sebagai teks terlebih dahulu
  } catch (textError) {
    console.warn(`[apiClient.${method.toLowerCase()}] Could not read response text for ${endpoint}:`, textError);
  }

  console.log(`[apiClient.${method.toLowerCase()}] Response for ${endpoint}: status=${responseStatus}, text="${responseDataText.substring(0, 100)}${responseDataText.length > 100 ? '...' : ''}"`);

  if (!response.ok) {
    let errorData: ApiErrorData = { detail: `API ${method} ${endpoint} failed with status ${responseStatus}.` };
    if (responseDataText) {
        try {
            errorData = JSON.parse(responseDataText); // Coba parse sebagai JSON jika ada teks
        } catch (e) {
            console.warn(`[apiClient.${method.toLowerCase()}] Failed to parse error response text as JSON for ${endpoint}:`, responseDataText);
            errorData.detail = `${errorData.detail} Response: ${responseDataText}`;
        }
    }
    
    const error: ApiError = new Error(
      errorData.detail || 
      (typeof errorData === 'object' ? Object.values(errorData).flat().join(' ') : `HTTP error ${responseStatus}`)
    );
    error.response = { data: errorData, status: responseStatus };
    console.error(`[apiClient.${method.toLowerCase()}] Error for ${endpoint}:`, error);
    throw error;
  }

  if (responseStatus === 204 || responseDataText.length === 0) { // Handle No Content atau body kosong
    return null;
  }

  try {
    return JSON.parse(responseDataText); // Parse sebagai JSON jika ada body dan sukses
  } catch (e) {
    console.warn(`[apiClient.${method.toLowerCase()}] Failed to parse success response as JSON for ${endpoint}, returning raw text. Error:`, e);
    return responseDataText; // Kembalikan teks jika parsing gagal tapi respons OK
  }
}


export const apiClient = {
  get: async (endpoint: string) => {
    const headers = getAuthHeaders(); // isFormData defaultnya false
    console.log(`[apiClient.get] Sending GET request to: ${endpoint}`);
    console.log(`[apiClient.get] Headers:`, headers);

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'GET',
      headers,
    });
    return handleResponse(response, endpoint, 'GET');
  },

  post: async (endpoint: string, body: any) => {
    const isFormData = body instanceof FormData;
    const headers = getAuthHeaders(isFormData);
    
    console.log(`[apiClient.post] Sending POST request to: ${endpoint}`);
    console.log(`[apiClient.post] Body type: ${typeof body}, isFormData: ${isFormData}`);
    console.log(`[apiClient.post] Headers:`, headers);
    if (!isFormData) {
      console.log(`[apiClient.post] Body (JSON):`, body);
    } else {
      // Untuk FormData, logging entries bisa dilakukan di komponen sebelum memanggil apiClient
      console.log(`[apiClient.post] Body is FormData (entries logged in calling component).`);
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: isFormData ? body : JSON.stringify(body),
    });
    return handleResponse(response, endpoint, 'POST');
  },

  put: async (endpoint: string, body: any) => { // Menambahkan method PUT
    const isFormData = body instanceof FormData;
    const headers = getAuthHeaders(isFormData);

    console.log(`[apiClient.put] Sending PUT request to: ${endpoint}`);
    console.log(`[apiClient.put] Body type: ${typeof body}, isFormData: ${isFormData}`);
    console.log(`[apiClient.put] Headers:`, headers);
     if (!isFormData) {
      console.log(`[apiClient.put] Body (JSON):`, body);
    } else {
      console.log(`[apiClient.put] Body is FormData.`);
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers,
      body: isFormData ? body : JSON.stringify(body),
    });
    return handleResponse(response, endpoint, 'PUT');
  },

  patch: async (endpoint: string, body: any) => {
    const isFormData = body instanceof FormData;
    const headers = getAuthHeaders(isFormData);

    console.log(`[apiClient.patch] Sending PATCH request to: ${endpoint}`);
    console.log(`[apiClient.patch] Body type: ${typeof body}, isFormData: ${isFormData}`);
    console.log(`[apiClient.patch] Headers:`, headers);
    if (!isFormData) {
      console.log(`[apiClient.patch] Body (JSON):`, body);
    } else {
      console.log(`[apiClient.patch] Body is FormData.`);
    }
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PATCH',
      headers,
      body: isFormData ? body : JSON.stringify(body),
    });
    return handleResponse(response, endpoint, 'PATCH');
  },

  delete: async (endpoint: string) => {
    const headers = getAuthHeaders();
    console.log(`[apiClient.delete] Sending DELETE request to: ${endpoint}`);
    console.log(`[apiClient.delete] Headers:`, headers);

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'DELETE',
      headers,
    });
    return handleResponse(response, endpoint, 'DELETE');
  },
};