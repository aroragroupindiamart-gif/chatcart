import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Layout } from "@/components/Layout";
import { useListOrders } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";

export default function Orders() {
  return (
    <ProtectedRoute>
      <Layout>
        <OrdersContent />
      </Layout>
    </ProtectedRoute>
  );
}

function OrdersContent() {
  const { data, isLoading } = useListOrders();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Orders</h1>
        <p className="text-slate-500 mt-1">Manage and fulfill your customer orders</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-500">Loading orders...</div>
        ) : data?.orders && data.orders.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {data.orders.map((order) => (
              <div key={order.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-bold text-slate-900">{order.id}</h3>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                      ${order.status === 'pending' ? 'bg-amber-100 text-amber-800' : 
                        order.status === 'confirmed' ? 'bg-blue-100 text-blue-800' : 
                        'bg-green-100 text-green-800'}`}
                    >
                      {order.status}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500">
                    {new Date(order.createdAt).toLocaleDateString()} • {order.customerContact || "Unknown"}
                  </p>
                </div>
                
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="font-bold text-slate-900">₹{order.totalAmount}</p>
                    <p className="text-xs text-slate-500">{order.itemCount} items</p>
                  </div>
                  <Link href={`/orders/${order.id}`} className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2">
                    View Details
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center">
            <h3 className="text-lg font-medium text-slate-900">No orders yet</h3>
            <p className="text-slate-500 mt-1">When customers place orders, they will appear here.</p>
          </div>
        )}
      </div>
    </div>
  );
}
