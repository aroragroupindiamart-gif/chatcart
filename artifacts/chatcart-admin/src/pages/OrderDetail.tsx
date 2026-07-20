import React, { useState } from 'react';
import { useRoute, Link } from 'wouter';
import { Layout } from '@/components/Layout';
import { useAdminOrder } from '@/hooks/useAdminApi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Phone, Calendar, Package, X, Store } from 'lucide-react';

function imgSrc(url: string): string {
  return url.replace(/^\/objects\//, "/api/public/img/");
}

function ImageLightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white bg-black/50 rounded-full p-2 hover:bg-black/70 transition-colors"
        aria-label="Close"
      >
        <X className="w-5 h-5" />
      </button>
      <img
        src={src}
        alt={alt}
        className="max-w-full max-h-full object-contain rounded-lg"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}

function ProductImage({ url, name }: { url: string; name: string }) {
  const [error, setError] = useState(false);
  const [lightbox, setLightbox] = useState(false);
  const src = imgSrc(url);

  if (error) {
    return (
      <div className="w-14 h-14 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center shrink-0">
        <Package className="w-6.5 h-6.5 text-slate-300" />
      </div>
    );
  }

  return (
    <>
      <img
        src={src}
        alt={name}
        className="w-14 h-14 rounded-lg object-cover shrink-0 border border-slate-200 cursor-pointer hover:opacity-90 active:opacity-75 transition-opacity"
        onError={() => setError(true)}
        onClick={() => setLightbox(true)}
        title="Tap to view full size"
      />
      {lightbox && (
        <ImageLightbox src={src} alt={name} onClose={() => setLightbox(false)} />
      )}
    </>
  );
}

export default function OrderDetail() {
  const [, params] = useRoute('/orders/:id');
  const id = params?.id || '';

  const { data: order, isLoading } = useAdminOrder(id);

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-md" />
            <Skeleton className="h-8 w-64" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <Skeleton className="h-96 w-full" />
            </div>
            <div>
              <Skeleton className="h-48 w-full" />
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!order) {
    return (
      <Layout>
        <div className="p-8 text-center text-muted-foreground">Order not found.</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 max-w-5xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/orders"
              className="p-2 rounded-md hover:bg-muted text-muted-foreground transition-colors shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight truncate">
              Order Details
            </h1>
          </div>
          <div className="flex items-center gap-3 sm:ml-auto shrink-0">
            <span className="text-xs font-mono bg-muted px-2 py-1 rounded text-muted-foreground select-all">
              ID: {order.id}
            </span>
            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${
                order.status === 'fulfilled'
                  ? 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300'
                  : order.status === 'confirmed'
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
              }`}
            >
              {order.status}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Items Section */}
          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Items Ordered ({order.itemsCount})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="divide-y divide-border">
                  {order.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="py-4 first:pt-0 last:pb-0 flex gap-4 items-start"
                    >
                      {item.productImageSnapshot ? (
                        <ProductImage
                          url={item.productImageSnapshot}
                          name={item.productNameSnapshot}
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-lg border border-border bg-muted flex items-center justify-center shrink-0">
                          <Package className="w-6 h-6 text-muted-foreground/40" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">
                          {item.productNameSnapshot}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {item.quantity} × ₹{item.priceSnapshot}
                          {item.variantSnapshot && (
                            <span className="ml-2 px-1.5 py-0.5 bg-muted rounded text-[10px] uppercase font-semibold">
                              {item.variantSnapshot}
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="font-bold text-sm text-right shrink-0">
                        ₹{(item.quantity * item.priceSnapshot).toFixed(2)}
                      </div>
                    </div>
                  ))}
                  <div className="pt-4 flex justify-between items-center text-lg font-bold">
                    <span>Total Amount</span>
                    <span className="text-primary text-xl">₹{order.total}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Details Metadata Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Customer Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Customer Name</div>
                  <div className="font-medium text-sm">{order.customerName}</div>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span className="font-mono">{order.customerPhone}</span>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Raw Contact Info</div>
                  <div className="text-xs bg-muted p-2 rounded font-mono text-muted-foreground break-all">
                    {order.customerContact || "None"}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Store & Timeline</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Store / Seller</div>
                  <div className="flex items-center gap-2">
                    <Store className="w-4 h-4 text-primary" />
                    <Link href={`/sellers/${order.sellerId}`} className="font-semibold text-sm hover:underline text-primary">
                      {order.storeName}
                    </Link>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">Seller Phone: {order.storePhone}</div>
                </div>
                <div className="flex items-start gap-3 text-sm">
                  <Calendar className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <div className="text-xs text-muted-foreground">Order Date</div>
                    <div>
                      {new Date(order.createdAt).toLocaleString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
