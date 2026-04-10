const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

export async function getApiStatus() {
  const response = await fetch(`${API_BASE_URL}/status`);

  if (!response.ok) {
    throw new Error(`API request failed with status ${response.status}`);
  }

  return response.json();
}
