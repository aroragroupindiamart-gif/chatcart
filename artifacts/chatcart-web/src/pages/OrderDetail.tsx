import { useState } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Layout } from "@/components/Layout";
import {
  useGetOrder,
  useUpdateOrderStatus,
  getGetOrderQueryKey,
  type OrderStatus,
} from "@workspace/api-client-react";
import { useParams, Link } from "wouter";
import { ArrowLeft, Phone, Calendar, X, Package, Share2, RotateCcw, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

function imgSrc(url: string): string {
  return url.replace(/^\/objects\//, "/api/public/img/");
}

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  confirmed: "bg-blue-100 text-blue-800",
  fulfilled: "bg-green-100 text-green-800",
};

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
        <Package className="w-6 h-6 text-slate-300" />
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
  return (
    <ProtectedRoute>
      <Layout>
        <OrderDetailContent />
      </Layout>
    </ProtectedRoute>
  );
}

function OrderDetailContent() {
  const params = useParams();
  const orderId = params.id as string;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: order, isLoading } = useGetOrder(orderId, {
    query: {
      enabled: !!orderId,
      queryKey: getGetOrderQueryKey(orderId),
    },
  });

  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [isSavingQuantities, setIsSavingQuantities] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  const handleQtyChange = (itemId: number, newQty: number) => {
    const clamped = Math.max(0, newQty);
    setQuantities((prev) => ({
      ...prev,
      [itemId]: clamped,
    }));
  };

  const handleResetItem = (itemId: number, originalQty: number) => {
    setQuantities((prev) => ({
      ...prev,
      [itemId]: originalQty,
    }));
  };

  const handleRestoreAll = async () => {
    if (!order) return;
    setIsRestoring(true);
    try {
      const token = localStorage.getItem("chatcart_token");
      const res = await fetch(`/api/orders/${order.id}/items`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({ restoreAll: true }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed to restore item quantities");
      }

      setQuantities({});
      await queryClient.invalidateQueries({ queryKey: getGetOrderQueryKey(orderId) });
      toast({ title: "Restored to original ordered quantities" });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to restore quantities",
        variant: "destructive",
      });
    } finally {
      setIsRestoring(false);
    }
  };

  const handleSaveQuantities = async () => {
    if (!order) return;
    setIsSavingQuantities(true);
    try {
      const token = localStorage.getItem("chatcart_token");
      const payload = {
        items: order.items.map((item) => ({
          id: item.id,
          availableQuantity: quantities[item.id] !== undefined ? quantities[item.id] : ((item as any).availableQuantity ?? item.quantity),
        })),
      };

      const res = await fetch(`/api/orders/${order.id}/items`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed to update item quantities");
      }

      await queryClient.invalidateQueries({ queryKey: getGetOrderQueryKey(orderId) });
      toast({ title: "Available quantities updated successfully" });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to update item quantities",
        variant: "destructive",
      });
    } finally {
      setIsSavingQuantities(false);
    }
  };

  const updateStatus = useUpdateOrderStatus();

  const handleStatusChange = async (newStatus: string) => {
    try {
      await updateStatus.mutateAsync({
        orderId,
        data: { status: newStatus as OrderStatus },
      });
      queryClient.invalidateQueries({ queryKey: getGetOrderQueryKey(orderId) });
      toast({ title: "Order status updated" });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to update status",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center text-slate-500">Loading order...</div>
    );
  }

  if (!order) {
    return (
      <div className="p-8 text-center text-slate-500">Order not found</div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/orders"
            className="p-2 rounded-md hover:bg-slate-100 text-slate-500 transition-colors shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 truncate">
            Order {order.id}
          </h1>
        </div>
        <div className="flex items-center gap-3 sm:ml-auto shrink-0">
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${STATUS_STYLES[order.status] ?? "bg-slate-100 text-slate-700"}`}
          >
            {order.status}
          </span>
          <Select
            value={order.status}
            onValueChange={handleStatusChange}
            disabled={updateStatus.isPending}
          >
            <SelectTrigger className="w-36 h-8 text-sm">
              <SelectValue placeholder="Update status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="fulfilled">Fulfilled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2">
              <CardTitle>Items</CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleRestoreAll}
                  disabled={isSavingQuantities || isRestoring}
                  className="text-xs h-8 text-slate-700 border-slate-300 hover:bg-slate-100 flex items-center gap-1.5"
                  title="Revert all item quantities back to the originally ordered amounts"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  {isRestoring ? "Restoring..." : "Restore to Original"}
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveQuantities}
                  disabled={isSavingQuantities || isRestoring}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs h-8 flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  {isSavingQuantities ? "Saving..." : "Save Available Quantities"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-slate-100">
                {order.items.map((item, idx) => {
                  const isSoldOut = Boolean((item as any).isSoldOut);
                  const currentAvail = quantities[item.id] !== undefined ? quantities[item.id] : ((item as any).availableQuantity ?? item.quantity);
                  const isPartiallyAvailable = !isSoldOut && currentAvail < item.quantity;
                  const isIncreased = !isSoldOut && currentAvail > item.quantity;
                  return (
                    <div
                      key={idx}
                      className={`py-4 first:pt-0 last:pb-0 flex gap-3 items-start ${isSoldOut ? "opacity-60 bg-red-50/40 p-2 rounded-lg" : ""}`}
                    >
                      {item.productImageSnapshot && (
                        <ProductImage
                          url={item.productImageSnapshot}
                          name={item.productNameSnapshot}
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className={`font-medium ${isSoldOut ? "line-through text-slate-500" : "text-slate-900"}`}>
                            {item.productNameSnapshot}
                          </p>
                          {isSoldOut ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700">
                              Sold Out ({(item as any).soldOutReason || "Unavailable"})
                            </span>
                          ) : isIncreased ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800">
                              {currentAvail} of {item.quantity} (+{currentAvail - item.quantity} added)
                            </span>
                          ) : isPartiallyAvailable ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                              {currentAvail} of {item.quantity} Available ({item.quantity - currentAvail} short)
                            </span>
                          ) : null}
                        </div>
                        <p className="text-sm text-slate-500">
                          {item.quantity} × ₹{item.priceSnapshot}
                          {item.variantSnapshot && ` · ${item.variantSnapshot}`}
                        </p>

                        {/* Inline Vendor Available Qty Stepper */}
                        <div className="flex items-center gap-2 mt-2 pt-1 flex-wrap">
                          <span className="text-xs font-semibold text-slate-600">Available:</span>
                          <div className="inline-flex items-center border border-slate-300 rounded bg-white shadow-xs">
                            <button
                              type="button"
                              onClick={() => handleQtyChange(item.id, currentAvail - 1)}
                              disabled={isSavingQuantities || isRestoring || currentAvail <= 0}
                              className="px-2 py-0.5 text-slate-600 hover:bg-slate-100 disabled:opacity-30 text-xs font-bold"
                            >
                              −
                            </button>
                            <input
                              type="number"
                              min={0}
                              value={currentAvail}
                              onChange={(e) => handleQtyChange(item.id, parseInt(e.target.value) || 0)}
                              className="w-12 text-center text-xs font-bold border-x border-slate-200 py-0.5 focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => handleQtyChange(item.id, currentAvail + 1)}
                              disabled={isSavingQuantities || isRestoring}
                              className="px-2 py-0.5 text-slate-600 hover:bg-slate-100 disabled:opacity-30 text-xs font-bold"
                            >
                              +
                            </button>
                          </div>
                          <span className="text-[11px] text-slate-500">of {item.quantity} ordered</span>

                          {currentAvail !== item.quantity && (
                            <button
                              type="button"
                              onClick={() => handleResetItem(item.id, item.quantity)}
                              disabled={isSavingQuantities || isRestoring}
                              className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium underline inline-flex items-center gap-0.5 ml-1"
                              title="Reset this item back to ordered quantity"
                            >
                              <RotateCcw className="w-3 h-3" />
                              Reset to {item.quantity}
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        {isSoldOut ? (
                          <div>
                            <span className="text-xs line-through text-slate-400 block">
                              ₹{(item.quantity * item.priceSnapshot).toFixed(2)}
                            </span>
                            <span className="text-xs font-bold text-red-600 block">
                              ₹0.00
                            </span>
                          </div>
                        ) : currentAvail !== item.quantity ? (
                          <div>
                            <span className="text-xs line-through text-slate-400 block">
                              ₹{(item.quantity * item.priceSnapshot).toFixed(2)}
                            </span>
                            <span className={`text-sm font-bold block ${currentAvail > item.quantity ? "text-indigo-700" : "text-emerald-700"}`}>
                              ₹{(currentAvail * item.priceSnapshot).toFixed(2)}
                            </span>
                          </div>
                        ) : (
                          <div className="font-bold text-slate-900">
                            ₹{(item.quantity * item.priceSnapshot).toFixed(2)}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {(() => {
                  let addedTotal = 0;
                  let addedCount = 0;
                  let unavailableTotal = 0;
                  let unavailableCount = 0;

                  for (const i of order.items as any[]) {
                    const eff = i.effectiveQuantity ?? (i.isSoldOut ? 0 : i.quantity);
                    if (eff > i.quantity) {
                      const diff = eff - i.quantity;
                      addedCount += diff;
                      addedTotal += diff * i.priceSnapshot;
                    } else if (eff < i.quantity) {
                      const diff = i.quantity - eff;
                      unavailableCount += diff;
                      unavailableTotal += diff * i.priceSnapshot;
                    }
                  }

                  const hasChanges = Boolean((order as any).hasSoldOutItems || addedTotal > 0 || unavailableTotal > 0);
                  const originalSub = Number((order as any).subtotalAmount || 0);
                  const payableSub = Number((order as any).payableSubtotalAmount ?? originalSub);
                  const gstDiff = Number((order as any).gstAmount || 0) - Number((order as any).payableGstAmount || 0);

                  if (hasChanges) {
                    return (
                      <div className="pt-4 border-t border-slate-100 space-y-3">
                        <div className="space-y-1 text-sm text-slate-500 pb-2 border-b border-slate-100">
                          <div className="flex justify-between items-center">
                            <span>Original Items Total ({order.items.length} items):</span>
                            <span className="font-semibold text-slate-900">₹{originalSub.toFixed(2)}</span>
                          </div>
                        </div>

                        {/* Adjustments breakdown */}
                        <div className="space-y-1.5 text-xs">
                          {unavailableTotal > 0 && (
                            <div className="bg-red-50 p-2.5 rounded-lg border border-red-100 space-y-1">
                              <div className="flex justify-between font-semibold text-red-900">
                                <span>Unavailable Items Deducted ({unavailableCount} pcs):</span>
                                <span>−₹{unavailableTotal.toFixed(2)}</span>
                              </div>
                              {gstDiff > 0 && (
                                <div className="flex justify-between text-red-700 text-[11px]">
                                  <span>GST Refund on unavailable items:</span>
                                  <span>−₹{gstDiff.toFixed(2)}</span>
                                </div>
                              )}
                            </div>
                          )}

                          {addedTotal > 0 && (
                            <div className="bg-indigo-50 p-2.5 rounded-lg border border-indigo-100 space-y-1">
                              <div className="flex justify-between font-semibold text-indigo-900">
                                <span>Additional Items Added ({addedCount} pcs):</span>
                                <span>+₹{addedTotal.toFixed(2)}</span>
                              </div>
                              {gstDiff < 0 && (
                                <div className="flex justify-between text-indigo-700 text-[11px]">
                                  <span>GST on additional items:</span>
                                  <span>+₹{(-gstDiff).toFixed(2)}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* In-stock items subtotal & taxes */}
                        <div className="space-y-1.5 text-sm text-slate-500 pt-1">
                          <div className="flex justify-between items-center">
                            <span>In-Stock Items Subtotal</span>
                            <span className="font-medium text-slate-900">₹{payableSub.toFixed(2)}</span>
                          </div>
                        </div>
                        {(order as any).payableGstAmount != null && (order as any).payableGstAmount > 0 && (
                          <div className="flex justify-between items-center">
                            <span>GST ({(order as any).gstPercentage}%)</span>
                            <span className="font-medium text-slate-900">₹{Number((order as any).payableGstAmount).toFixed(2)}</span>
                          </div>
                        )}
                        {(order as any).payableShippingAmount != null && (order as any).payableShippingAmount > 0 && (
                          <div className="flex justify-between items-center">
                            <span>Shipping ({(order as any).payableShippingKg ?? 1} kg shipping)</span>
                            <span className="font-medium text-slate-900">₹{Number((order as any).payableShippingAmount).toFixed(2)}</span>
                          </div>
                        )}

                        {/* Final Payable Total Banner */}
                        <div className="pt-3 border-t-2 border-primary/20 bg-primary/5 -mx-6 -mb-6 p-4 rounded-b-lg">
                          <div className="flex justify-between items-center">
                            <div>
                              <span className="text-base font-bold text-slate-900 block">Final Payable Balance</span>
                              <span className="text-xs text-slate-500">Amount customer will pay for in-stock items</span>
                            </div>
                            <span className="text-xl font-extrabold text-primary">
                              ₹{Number((order as any).payableTotalAmount).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  if ((order as any).subtotalAmount != null && ((order as any).gstAmount > 0 || (order as any).shippingAmount > 0)) {
                    return (
                      <div className="pt-4 border-t border-slate-100 space-y-2">
                        <div className="flex justify-between items-center text-sm text-slate-500">
                          <span>Items Subtotal</span>
                          <span>₹{Number((order as any).subtotalAmount).toFixed(2)}</span>
                        </div>
                        {(order as any).gstAmount != null && (order as any).gstAmount > 0 && (
                          <div className="flex justify-between items-center text-sm text-slate-500">
                            <span>GST ({(order as any).gstPercentage}%)</span>
                            <span>₹{Number((order as any).gstAmount).toFixed(2)}</span>
                          </div>
                        )}
                        {(order as any).shippingAmount != null && (order as any).shippingAmount > 0 && (
                          <div className="flex justify-between items-center text-sm text-slate-500">
                            <span>Shipping ({(order as any).shippingKg ?? 1} kg shipping)</span>
                            <span>₹{Number((order as any).shippingAmount).toFixed(2)}</span>
                          </div>
                        )}
                        <div className="pt-2 flex justify-between items-center text-lg font-bold text-slate-900 border-t border-slate-100">
                          <span>Total</span>
                          <span>₹{order.totalAmount}</span>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div className="pt-4 flex justify-between items-center text-lg font-bold text-slate-900 border-t border-slate-100">
                      <span>Total</span>
                      <span>₹{order.totalAmount}</span>
                    </div>
                  );
                })()}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Customer Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 text-slate-600">
                <Phone className="w-4 h-4" />
                <span>{order.customerContact || "Not provided"}</span>
              </div>
              <div className="flex items-center gap-3 text-slate-600">
                <Calendar className="w-4 h-4" />
                <span>
                  {new Date(order.createdAt).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <div className="pt-2 border-t border-slate-100">
                <Button
                  onClick={() => {
                    const url = `${window.location.origin}/store/orders/${order.id}`;
                    navigator.clipboard.writeText(url);
                    toast({
                      title: "Link Copied!",
                      description: "Public order link has been copied to clipboard.",
                    });
                  }}
                  className="w-full text-xs h-9 gap-1.5"
                  variant="outline"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  Copy Order Link
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
