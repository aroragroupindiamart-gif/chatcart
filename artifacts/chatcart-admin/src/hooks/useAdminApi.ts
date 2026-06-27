import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminFetch } from '../lib/adminFetch';

// Types
export interface HealthStats {
  sellers: { total: number; active: number; trial: number; suspended: number; lifetimeCount: number };
  orders: { today: number; thisWeek: number; thisMonth: number };
  signupTrend: Array<{ date: string; count: number }>;
}

export interface Seller {
  id: string;
  phone: string;
  storeName: string;
  subdomain: string | null;
  whatsappNumber: string | null;
  subscriptionPlan: string;
  subscriptionStatus: string;
  isSuspended: boolean;
  suspensionReason: string | null;
  suspendedAt: string | null;
  subscriptionStartDate: string | null;
  subscriptionEndDate: string | null;
  createdAt: string;
  productCount?: number;
  orderCount?: number;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  status: string;
  createdAt: string;
}

export interface Order {
  id: string;
  total: number;
  status: string;
  createdAt: string;
  customerName?: string;
  customerPhone: string;
  itemsCount: number;
}

export interface GlobalOrder {
  order: Order;
  storeName: string;
  phone: string;
}

export interface AuditLog {
  log: {
    id: string;
    action: string;
    targetSellerId: string | null;
    targetOrderId: string | null;
    details: any;
    ipAddress: string;
    createdAt: string;
  };
  adminEmail: string;
}

export interface ContactSubmission {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  message: string;
  createdAt: string;
}

// Hooks

export const useHealth = () => {
  return useQuery<HealthStats>({
    queryKey: ['admin', 'health'],
    queryFn: () => adminFetch<HealthStats>('/api/admin/health'),
  });
};

export const useSellers = (params?: { q?: string; status?: string; plan?: string }) => {
  const clean = Object.fromEntries(Object.entries(params ?? {}).filter(([, v]) => v !== undefined && v !== null));
  const query = new URLSearchParams(clean).toString();
  return useQuery<Seller[]>({
    queryKey: ['admin', 'sellers', params],
    queryFn: () => adminFetch<Seller[]>(`/api/admin/sellers${query ? `?${query}` : ''}`),
  });
};

export const useSeller = (id: string) => {
  return useQuery<Seller>({
    queryKey: ['admin', 'seller', id],
    queryFn: () => adminFetch<Seller>(`/api/admin/sellers/${id}`),
    enabled: !!id,
  });
};

export const useSellerProducts = (id: string) => {
  return useQuery<Product[]>({
    queryKey: ['admin', 'seller', id, 'products'],
    queryFn: () => adminFetch<Product[]>(`/api/admin/sellers/${id}/products`),
    enabled: !!id,
  });
};

export const useSellerOrders = (id: string) => {
  return useQuery<Order[]>({
    queryKey: ['admin', 'seller', id, 'orders'],
    queryFn: () => adminFetch<Order[]>(`/api/admin/sellers/${id}/orders`),
    enabled: !!id,
  });
};

export const useUpdateSubscription = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      adminFetch(`/api/admin/sellers/${id}/subscription`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'seller', id] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'sellers'] });
    },
  });
};

export const useSuspendSeller = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      adminFetch(`/api/admin/sellers/${id}/suspend`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'seller', id] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'sellers'] });
    },
  });
};

export const useReactivateSeller = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      adminFetch(`/api/admin/sellers/${id}/reactivate`, {
        method: 'POST',
      }),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'seller', id] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'sellers'] });
    },
  });
};

export const useOrders = (params?: { sellerId?: string; status?: string; page?: number; limit?: number }) => {
  const clean = Object.fromEntries(Object.entries(params ?? {}).filter(([, v]) => v !== undefined && v !== null));
  const query = new URLSearchParams(clean as any).toString();
  return useQuery<GlobalOrder[]>({
    queryKey: ['admin', 'orders', params],
    queryFn: () => adminFetch<GlobalOrder[]>(`/api/admin/orders${query ? `?${query}` : ''}`),
  });
};

export const useAuditLogs = (params?: { action?: string; targetSellerId?: string; page?: number; limit?: number }) => {
  const clean = Object.fromEntries(Object.entries(params ?? {}).filter(([, v]) => v !== undefined && v !== null));
  const query = new URLSearchParams(clean as any).toString();
  return useQuery<AuditLog[]>({
    queryKey: ['admin', 'audit-log', params],
    queryFn: () => adminFetch<AuditLog[]>(`/api/admin/audit-log${query ? `?${query}` : ''}`),
  });
};

export const useContactSubmissions = () => {
  return useQuery<ContactSubmission[]>({
    queryKey: ['admin', 'contact-submissions'],
    queryFn: () => adminFetch<ContactSubmission[]>('/api/admin/contact-submissions'),
  });
};

// ── WhatsApp Marketing ────────────────────────────────────────────────────────

export interface WASequence {
  id: number;
  name: string;
  description: string | null;
  steps: Array<{ id: number; hourOffset: number; message: string }>;
  leadCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface WALead {
  id: number;
  sequenceId: number;
  sequenceName: string;
  sellerId: number | null;
  storeName: string | null;
  phone: string | null;
  currentHourOffset: number;
  status: string;
  nextSendAt: string | null;
  lastSentAt: string | null;
  repliedAt: string | null;
  createdAt: string;
}

export const useWASequences = () => {
  return useQuery<WASequence[]>({
    queryKey: ['admin', 'wa', 'sequences'],
    queryFn: () => adminFetch<WASequence[]>('/api/admin/wa/sequences'),
  });
};

export const useWALeadsBySeller = (sellerId: string | number) => {
  return useQuery<WALead[]>({
    queryKey: ['admin', 'wa', 'leads', 'seller', sellerId],
    queryFn: () => adminFetch<WALead[]>(`/api/admin/wa/leads?sellerId=${sellerId}`),
    enabled: !!sellerId,
  });
};

export const useEnrollInSequence = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ sequenceId, sellerIds }: { sequenceId: number; sellerIds: number[] }) =>
      adminFetch<{ ok: boolean; added: number; skipped: number }>('/api/admin/wa/leads', {
        method: 'POST',
        body: JSON.stringify({ sequenceId, sellerIds }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'wa', 'leads'] });
    },
  });
};

export const useRemoveFromWASequence = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (leadId: number) =>
      adminFetch(`/api/admin/wa/leads/${leadId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'removed' }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'wa', 'leads'] });
    },
  });
};

export const useBulkActivateSellers = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ sellerIds, plan, status }: { sellerIds: number[]; plan: string; status?: string }) =>
      adminFetch<{ ok: boolean; updated: number }>('/api/admin/sellers/bulk-activate', {
        method: 'POST',
        body: JSON.stringify({ sellerIds, plan, status: status ?? 'active' }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'sellers'] });
    },
  });
};
