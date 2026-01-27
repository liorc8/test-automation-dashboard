import type { AreaSummaryResponse } from '../types/AreaSummary';

const API_BASE_URL = 'http://localhost:5000/api';

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }
  return response.json();
}

export const getAreaSummary = async (areaName: string, limit: number = 10): Promise<AreaSummaryResponse> => {
  const url = `${API_BASE_URL}/areas/${areaName}/summary?limit=${limit}`;
  
  const response = await fetch(url);
  return handleResponse<AreaSummaryResponse>(response);
};
