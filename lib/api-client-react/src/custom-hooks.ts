import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getListExpensesQueryKey } from "./generated/api";

export type ReceiptParseData = {
  amount: number | null;
  platform: string | null;
  category: string | null;
  date: string | null;
  description: string | null;
};

export type ReceiptParseResult = {
  success: boolean;
  data: ReceiptParseData;
};

export function useUploadReceipt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File): Promise<ReceiptParseResult> => {
      const formData = new FormData();
      formData.append("receipt", file);

      const response = await fetch("/api/receipts/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload receipt");
      }

      return response.json();
    },
    onSuccess: () => {
      // We don't necessarily want to invalidate expenses yet because the user hasn't saved it,
      // but we might want to refresh some metadata if needed.
    },
  });
}

export function useGetSmartSuggestions() {
  return useQuery({
    queryKey: ["analytics", "suggestions"],
    queryFn: async (): Promise<any[]> => {
      const response = await fetch("/api/analytics/smart-suggestions");
      if (!response.ok) throw new Error("Failed to fetch suggestions");
      return response.json();
    },
  });
}

export function useGetForecast() {
  return useQuery({
    queryKey: ["analytics", "forecast"],
    queryFn: async (): Promise<any> => {
      const response = await fetch("/api/analytics/forecast");
      if (!response.ok) throw new Error("Failed to fetch forecast");
      return response.json();
    },
  });
}

export function useListWorkspaces() {
  return useQuery({
    queryKey: ["workspaces"],
    queryFn: async (): Promise<any[]> => {
      const response = await fetch("/api/workspaces");
      if (!response.ok) throw new Error("Failed to fetch workspaces");
      return response.json();
    },
  });
}

export function useCreateWorkspace() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ data }: { data: any }): Promise<any> => {
      const response = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create workspace");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
    },
  });
}

export function useListWorkspaceMembers(id: number) {
  return useQuery({
    queryKey: ["workspaces", id, "members"],
    queryFn: async (): Promise<any[]> => {
      const response = await fetch(`/api/workspaces/${id}/members`);
      if (!response.ok) throw new Error("Failed to fetch members");
      return response.json();
    },
    enabled: !!id,
  });
}

export function useInviteToWorkspace() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }): Promise<any> => {
      const response = await fetch(`/api/workspaces/${id}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to invite member");
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["workspaces", variables.id, "members"] });
    },
  });
}

export function useListWebhooks(workspaceId: number) {
  return useQuery({
    queryKey: ["webhooks", workspaceId],
    queryFn: async (): Promise<any[]> => {
      const response = await fetch(`/api/webhooks?workspaceId=${workspaceId}`);
      if (!response.ok) throw new Error("Failed to fetch webhooks");
      return response.json();
    },
    enabled: !!workspaceId,
  });
}

export function useCreateWebhook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ data }: { data: any }): Promise<any> => {
      const response = await fetch("/api/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create webhook");
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["webhooks", variables.data.workspaceId] });
    },
  });
}

export function useGetKpiSummary() {
  return useQuery({
    queryKey: ["dashboard", "kpi-summary"],
    queryFn: async (): Promise<any> => {
      const response = await fetch("/api/dashboard/kpi-summary");
      if (!response.ok) throw new Error("Failed to fetch KPI summary");
      return response.json();
    },
  });
}

export function useListSavingsOpportunities() {
  return useQuery({
    queryKey: ["analytics", "savings-opportunities"],
    queryFn: async (): Promise<any[]> => {
      const response = await fetch("/api/analytics/savings-opportunities");
      if (!response.ok) throw new Error("Failed to fetch savings opportunities");
      return response.json();
    },
  });
}

export function useGetIntelligenceActivity() {
  return useQuery({
    queryKey: ["dashboard", "intelligence-activity"],
    queryFn: async (): Promise<any[]> => {
      const response = await fetch("/api/dashboard/intelligence-activity");
      if (!response.ok) throw new Error("Failed to fetch intelligence activity");
      return response.json();
    },
  });
}

export function useListMonthlySpending() {
  return useQuery({
    queryKey: ["dashboard", "monthly-spending"],
    queryFn: async (): Promise<any[]> => {
      const response = await fetch("/api/dashboard/monthly-spending");
      if (!response.ok) throw new Error("Failed to fetch monthly spending");
      return response.json();
    },
  });
}

export function useListConnectedSources() {
  return useQuery({
    queryKey: ["dashboard", "connected-sources"],
    queryFn: async (): Promise<any[]> => {
      const response = await fetch("/api/dashboard/connected-sources");
      if (!response.ok) throw new Error("Failed to fetch connected sources");
      return response.json();
    },
  });
}
