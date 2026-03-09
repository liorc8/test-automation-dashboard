import type { AreaSummaryResponse } from "../types/AreaSummary";
import type { AreaItem } from "../types/Area";
import type { AreaHealthResponse, EnvHealthResponse } from "../types/Health";
import type { AreasDashboardResponse } from "../types/Dashboard";
import type { AreaRecentFailuresGroupedResponse } from "../types/RecentFailuresGrouped"; // <-- חדש

const API_BASE_URL = "http://localhost:5000/api";

export type EnvFilter = "qa" | "release" | "sandbox";

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
  daysBack: number = 8,
  env: EnvFilter = "qa"
): Promise<AreasDashboardResponse> => {
  const url = `${API_BASE_URL}/areas/dashboard?daysBack=${daysBack}&env=${env}`;
  const response = await fetch(url);
  return handleResponse<AreasDashboardResponse>(response);
};

export type HealthBucket = "healthy" | "medium" | "bad" | "dead";

export type HealthTestItem = {
  testName: string;
  passRate: number;
  successes: number;
  fails: number;
  lastRunDate: string;
  lastPassed: boolean;
};

export type AreaHealthTestsResponse = {
  areaName: string;
  bucket: HealthBucket;
  env: EnvFilter;
  tests: HealthTestItem[];
};

export const getAreaHealthTests = async (
  areaName: string,
  bucket: HealthBucket,
  env: EnvFilter = "qa"
): Promise<AreaHealthTestsResponse> => {
  const url = `${API_BASE_URL}/areas/${encodeURIComponent(areaName)}/health-tests?bucket=${bucket}&env=${env}`;
  const response = await fetch(url);
  return handleResponse<AreaHealthTestsResponse>(response);
};

export const getAreaRecentFailuresGrouped = async (
  areaName: string,
  windowDays: number = 10,
  limit: number = 200,
  env: EnvFilter = "qa"
): Promise<AreaRecentFailuresGroupedResponse> => {
  const url = `${API_BASE_URL}/areas/${encodeURIComponent(areaName)}/recent-failures-grouped?windowDays=${windowDays}&limit=${limit}&env=${env}`;
  const response = await fetch(url);
  return handleResponse<AreaRecentFailuresGroupedResponse>(response);
};