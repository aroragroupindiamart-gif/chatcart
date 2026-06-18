export interface Seller {
  id: number;
  storeName: string | null;
  subdomain: string | null;
  whatsappNumber: string | null;
}

export interface ProductImage {
  id: number;
  productId: number;
  url: string;
  displayOrder: number;
}

export interface ProductVariant {
  id: number;
  productId: number;
  label: string;
  options: string[];
}

export interface Product {
  id: number;
  sellerId: number;
  name: string;
  description: string | null;
  price: number;
  status: string;
  categoryId: number | null;
  sortOrder: number;
  images: ProductImage[];
  variants: ProductVariant[];
}

export interface OrderItem {
  id: number;
  productNameSnapshot: string;
  priceSnapshot: number;
  variantSnapshot: string | null;
  quantity: number;
}

export interface Order {
  id: string;
  status: string;
  totalAmount: number;
  customerContact: string | null;
  createdAt: string;
  sellerWhatsappNumber: string | null;
  sellerStoreName: string | null;
  sellerSubdomain: string | null;
  items: OrderItem[];
}

const BASE = "/api/public";

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export interface Category {
  id: number;
  name: string;
}

export const api = {
  getSeller: (subdomain: string) =>
    apiFetch<Seller>(`/sellers/${encodeURIComponent(subdomain)}`),

  getCategories: (subdomain: string) =>
    apiFetch<Category[]>(`/sellers/${encodeURIComponent(subdomain)}/categories`),

  getProducts: (subdomain: string) =>
    apiFetch<Product[]>(`/sellers/${encodeURIComponent(subdomain)}/products`),

  getProduct: (productId: number) =>
    apiFetch<Product>(`/products/${productId}`),

  createOrder: (body: {
    sellerId: number;
    customerContact?: string;
    items: Array<{
      productNameSnapshot: string;
      priceSnapshot: string;
      variantSnapshot?: string;
      quantity?: number;
    }>;
  }) =>
    apiFetch<Order>("/orders", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  getOrder: (orderId: string) =>
    apiFetch<Order>(`/orders/${encodeURIComponent(orderId)}`),
};

export function imgSrc(storedUrl: string): string {
  return storedUrl.replace(/^\/objects\//, "/api/public/img/");
}

export function formatPrice(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}
