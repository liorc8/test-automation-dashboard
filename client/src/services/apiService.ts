import type { AreaSummaryResponse } from "../types/AreaSummary";
import type { AreaItem } from "../types/Area";
import type { AreaHealthResponse, EnvHealthResponse } from "../types/Health";
import type { AreasDashboardResponse } from "../types/Dashboard";

const API_BASE_URL = "http://localhost:5000/api";

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export const getAreas = async (): Promise<AreaItem[]> => {
  const response = await fetch(`${API_BASE_URL}/areas`);
  return handleResponse<AreaItem[]>(response);
};

export const getAreaSummary = async (
  areaName: string,
  limit: number = 10
): Promise<AreaSummaryResponse> => {
  const url = `${API_BASE_URL}/areas/${encodeURIComponent(areaName)}/summary?limit=${limit}`;
  const response = await fetch(url);
  return handleResponse<AreaSummaryResponse>(response);
};

export const getAreaHealth = async (
  areaName: string,
  daysBack: number = 8
): Promise<AreaHealthResponse> => {
  const url = `${API_BASE_URL}/areas/${encodeURIComponent(areaName)}/health?daysBack=${daysBack}`;
  const response = await fetch(url);
  return handleResponse<AreaHealthResponse>(response);
};

export const getEnvHealth = async (
  env: string,
  daysBack: number = 8
): Promise<EnvHealthResponse> => {
  const url = `${API_BASE_URL}/envs/${encodeURIComponent(env)}/health?daysBack=${daysBack}`;
  const response = await fetch(url);
  return handleResponse<EnvHealthResponse>(response);
};

export const getAreasDashboard = async (
  daysBack: number = 8
): Promise<AreasDashboardResponse> => {
  const url = `${API_BASE_URL}/areas/dashboard?daysBack=${daysBack}`;
  const response = await fetch(url);
  return handleResponse<AreasDashboardResponse>(response);
};

