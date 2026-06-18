import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Layout } from "@/components/Layout";
import {
  useGetOrder,
  useUpdateOrderStatus,
  getGetOrderQueryKey,
  type OrderStatus,
} from "@workspace/api-client-react";
import { useParams, Link } from "wouter";
import { ArrowLeft, Phone, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  confirmed: "bg-blue-100 text-blue-800",
  fulfilled: "bg-green-100 text-green-800",
};

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
      <div className="flex items-center gap-4">
        <Link
          href="/orders"
          className="p-2 rounded-md hover:bg-slate-100 text-slate-500 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Order {order.id}
        </h1>
        <div className="ml-auto flex items-center gap-3">
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
            <SelectTrigger className="w-40 h-8 text-sm">
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
            <CardHeader>
              <CardTitle>Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-slate-100">
                {order.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="py-4 first:pt-0 last:pb-0 flex justify-between items-center"
                  >
                    <div>
                      <p className="font-medium text-slate-900">
                        {item.productNameSnapshot}
                      </p>
                      <p className="text-sm text-slate-500">
                        {item.quantity} × ₹{item.priceSnapshot}
                        {item.variantSnapshot && ` · ${item.variantSnapshot}`}
                      </p>
                    </div>
                    <div className="font-bold text-slate-900">
                      ₹{(item.quantity * item.priceSnapshot).toFixed(2)}
                    </div>
                  </div>
                ))}
                <div className="pt-4 flex justify-between items-center text-lg font-bold text-slate-900">
                  <span>Total</span>
                  <span>₹{order.totalAmount}</span>
                </div>
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
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
