import { apiClient } from "./api-client";

export const logService = {
  getAllLogs: async (): Promise<string> => {
    const response = await apiClient.get<string>("/logs", {
      responseType: "text",
    });
    return response.data;
  },

  getLogsByLevel: async (level: string): Promise<string> => {
    const response = await apiClient.get<string>(`/logs/level/${level}`, {
      responseType: "text",
    });
    return response.data;
  },
};
