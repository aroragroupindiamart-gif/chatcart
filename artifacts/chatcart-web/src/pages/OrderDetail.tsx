import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Layout } from "@/components/Layout";
import { useGetOrder, getGetOrderQueryKey, OrderStatus } from "@workspace/api-client-react";
import { useParams, Link } from "wouter";
import { ArrowLeft, MapPin, Phone, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQueryClient } from "@tanstack/react-query";

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
  const queryClient = useQueryClient();

  const { data: order, isLoading } = useGetOrder(orderId, {
    query: {
      enabled: !!orderId,
      queryKey: getGetOrderQueryKey(orderId)
    }
  });

  if (isLoading) {
    return <div className="p-8 text-center text-slate-500">Loading order...</div>;
  }

  if (!order) {
    return <div className="p-8 text-center text-slate-500">Order not found</div>;
  }

  // Real app would have an update order status mutation here
  // Mock function for UI completeness
  const handleStatusChange = (newStatus: string) => {
    // queryClient.setQueryData(...)
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Link href="/orders" className="p-2 rounded-md hover:bg-slate-100 text-slate-500 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Order {order.id}
        </h1>
        <div className="ml-auto">
          <Select value={order.status} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-40 font-medium">
              <SelectValue />
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
                  <div key={idx} className="py-4 first:pt-0 last:pb-0 flex justify-between items-center">
                    <div>
                      <p className="font-medium text-slate-900">{item.productNameSnapshot}</p>
                      <p className="text-sm text-slate-500">
                        {item.quantity} x ₹{item.priceSnapshot}
                        {item.variantSnapshot && ` • ${item.variantSnapshot}`}
                      </p>
                    </div>
                    <div className="font-bold text-slate-900">
                      ₹{item.quantity * item.priceSnapshot}
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
                <span>{new Date(order.createdAt).toLocaleDateString()} {new Date(order.createdAt).toLocaleTimeString()}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
