import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Layout } from "@/components/Layout";
import { useListOrders } from "@workspace/api-client-react";
import { Link } from "wouter";
import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Calendar,
  X,
  Loader2,
} from "lucide-react";

export default function Orders() {
  return (
    <ProtectedRoute>
      <Layout>
        <OrdersContent />
      </Layout>
    </ProtectedRoute>
  );
}

type DatePreset = "all" | "today" | "yesterday" | "7days" | "30days" | "custom";

function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function OrdersContent() {
  const [page, setPage] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const p = parseInt(params.get("page") || "1", 10);
      return isNaN(p) || p < 1 ? 1 : p;
    }
    return 1;
  });

  const [pageSize, setPageSize] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const l = parseInt(params.get("limit") || "30", 10);
      return [10, 20, 30, 50, 100, 500].includes(l) ? l : 30;
    }
    return 30;
  });

  const [statusFilter, setStatusFilter] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const s = params.get("status");
      return s && ["pending", "confirmed", "fulfilled"].includes(s) ? s : "all";
    }
    return "all";
  });

  const [datePreset, setDatePreset] = useState<DatePreset>(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const dp = params.get("datePreset") as DatePreset;
      if (dp && ["all", "today", "yesterday", "7days", "30days", "custom"].includes(dp)) {
        return dp;
      }
    }
    return "all";
  });

  const [customStartDate, setCustomStartDate] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      return params.get("startDate") || "";
    }
    return "";
  });

  const [customEndDate, setCustomEndDate] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      return params.get("endDate") || "";
    }
    return "";
  });

  // Calculate actual query start & end dates based on selected preset
  const { queryStartDate, queryEndDate } = useMemo(() => {
    const now = new Date();
    if (datePreset === "today") {
      const todayStr = formatLocalDate(now);
      return {
        queryStartDate: `${todayStr}T00:00:00.000`,
        queryEndDate: `${todayStr}T23:59:59.999`,
      };
    }
    if (datePreset === "yesterday") {
      const yest = new Date(now);
      yest.setDate(yest.getDate() - 1);
      const yestStr = formatLocalDate(yest);
      return {
        queryStartDate: `${yestStr}T00:00:00.000`,
        queryEndDate: `${yestStr}T23:59:59.999`,
      };
    }
    if (datePreset === "7days") {
      const d = new Date(now);
      d.setDate(d.getDate() - 6);
      const startStr = formatLocalDate(d);
      const endStr = formatLocalDate(now);
      return {
        queryStartDate: `${startStr}T00:00:00.000`,
        queryEndDate: `${endStr}T23:59:59.999`,
      };
    }
    if (datePreset === "30days") {
      const d = new Date(now);
      d.setDate(d.getDate() - 29);
      const startStr = formatLocalDate(d);
      const endStr = formatLocalDate(now);
      return {
        queryStartDate: `${startStr}T00:00:00.000`,
        queryEndDate: `${endStr}T23:59:59.999`,
      };
    }
    if (datePreset === "custom") {
      return {
        queryStartDate: customStartDate ? `${customStartDate}T00:00:00.000` : undefined,
        queryEndDate: customEndDate ? `${customEndDate}T23:59:59.999` : undefined,
      };
    }
    return { queryStartDate: undefined, queryEndDate: undefined };
  }, [datePreset, customStartDate, customEndDate]);

  // Sync state with URL query parameters
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    params.set("page", String(page));
    params.set("limit", String(pageSize));
    if (statusFilter !== "all") {
      params.set("status", statusFilter);
    } else {
      params.delete("status");
    }

    if (datePreset !== "all") {
      params.set("datePreset", datePreset);
      if (datePreset === "custom") {
        if (customStartDate) params.set("startDate", customStartDate);
        else params.delete("startDate");
        if (customEndDate) params.set("endDate", customEndDate);
        else params.delete("endDate");
      } else {
        params.delete("startDate");
        params.delete("endDate");
      }
    } else {
      params.delete("datePreset");
      params.delete("startDate");
      params.delete("endDate");
    }

    const newRelativePathQuery = window.location.pathname + "?" + params.toString();
    window.history.replaceState(null, "", newRelativePathQuery);
  }, [page, pageSize, statusFilter, datePreset, customStartDate, customEndDate]);

  const { data, isLoading, isFetching } = useListOrders({
    page,
    limit: pageSize,
    status: statusFilter === "all" ? undefined : statusFilter,
    startDate: queryStartDate,
    endDate: queryEndDate,
  });

  const totalOrders = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalOrders / pageSize));
  const startOrder = totalOrders === 0 ? 0 : (page - 1) * pageSize + 1;
  const endOrder = Math.min(page * pageSize, totalOrders);

  // Clamp page if total pages reduced
  useEffect(() => {
    if (totalPages > 0 && page > totalPages) {
      setPage(totalPages);
    }
  }, [totalPages, page]);

  const handlePageSizeChange = (val: string) => {
    setPageSize(Number(val));
    setPage(1);
  };

  const handleStatusChange = (status: string) => {
    setStatusFilter(status);
    setPage(1);
  };

  const handleDatePresetChange = (preset: string) => {
    setDatePreset(preset as DatePreset);
    setPage(1);
  };

  const handleClearDateFilter = () => {
    setDatePreset("all");
    setCustomStartDate("");
    setCustomEndDate("");
    setPage(1);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages || newPage === page) return;
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") return false;
    const ua = window.navigator?.userAgent || "";
    const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
    return isMobileUA || window.innerWidth < 1024;
  });

  useEffect(() => {
    const ua = window.navigator?.userAgent || "";
    const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
    const checkMobile = () => {
      setIsMobile(isMobileUA || window.innerWidth < 1024);
    };
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const datePresetLabel = useMemo(() => {
    switch (datePreset) {
      case "today":
        return "Today";
      case "yesterday":
        return "Yesterday";
      case "7days":
        return "Last 7 Days";
      case "30days":
        return "Last 30 Days";
      case "custom":
        if (customStartDate && customEndDate) {
          return `${customStartDate} to ${customEndDate}`;
        }
        if (customStartDate) return `From ${customStartDate}`;
        if (customEndDate) return `Until ${customEndDate}`;
        return "Custom Range";
      default:
        return "All Time";
    }
  }, [datePreset, customStartDate, customEndDate]);

  return (
    <div className="space-y-6">
      {/* ── Top Header & Filter Controls ── */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Orders</h1>
            <p className="text-slate-500 mt-1">Manage and fulfill your customer orders</p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Status Tabs */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
              {(["all", "pending", "confirmed", "fulfilled"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => handleStatusChange(s)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-all cursor-pointer ${
                    statusFilter === s
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            {/* Date Range Selector */}
            <div className="flex items-center gap-1.5">
              <Select value={datePreset} onValueChange={handleDatePresetChange}>
                <SelectTrigger className="w-[140px] h-9 text-xs bg-white border-slate-200">
                  <div className="flex items-center gap-1.5 truncate">
                    <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <SelectValue placeholder="Date Filter" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="yesterday">Yesterday</SelectItem>
                  <SelectItem value="7days">Last 7 Days</SelectItem>
                  <SelectItem value="30days">Last 30 Days</SelectItem>
                  <SelectItem value="custom">Custom Range...</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Orders Per Page Selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500 whitespace-nowrap hidden sm:inline">Show:</span>
              <Select value={String(pageSize)} onValueChange={handlePageSizeChange}>
                <SelectTrigger className="w-[115px] h-9 text-xs bg-white border-slate-200">
                  <SelectValue placeholder="Page size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 / page</SelectItem>
                  <SelectItem value="20">20 / page</SelectItem>
                  <SelectItem value="30">30 / page</SelectItem>
                  <SelectItem value="50">50 / page</SelectItem>
                  <SelectItem value="100">100 / page</SelectItem>
                  <SelectItem value="500">500 / page</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* ── Custom Date Range Inputs (when 'custom' preset is selected) ── */}
        {datePreset === "custom" && (
          <div className="flex flex-wrap items-center gap-3 bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs">
            <span className="font-medium text-slate-700 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-600" />
              Custom Date Range:
            </span>
            <div className="flex items-center gap-2">
              <span className="text-slate-500">From</span>
              <Input
                type="date"
                value={customStartDate}
                onChange={(e) => {
                  setCustomStartDate(e.target.value);
                  setPage(1);
                }}
                className="h-8 w-36 text-xs bg-white"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-500">To</span>
              <Input
                type="date"
                value={customEndDate}
                onChange={(e) => {
                  setCustomEndDate(e.target.value);
                  setPage(1);
                }}
                className="h-8 w-36 text-xs bg-white"
              />
            </div>
            {(customStartDate || customEndDate) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearDateFilter}
                className="h-8 px-2 text-xs text-slate-500 hover:text-slate-800"
              >
                <X className="w-3.5 h-3.5 mr-1" />
                Reset
              </Button>
            )}
          </div>
        )}

        {/* ── Active Date Filter Badge (when not 'all' and not custom inputs) ── */}
        {datePreset !== "all" && datePreset !== "custom" && (
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
              <Calendar className="w-3 h-3 text-indigo-500" />
              <span>Showing: {datePresetLabel}</span>
              <button
                type="button"
                onClick={handleClearDateFilter}
                className="ml-1 text-indigo-500 hover:text-indigo-800 cursor-pointer"
                title="Clear date filter"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Orders Table / List ── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 flex flex-col items-center justify-center text-slate-500 gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
            <span className="text-sm">Loading orders...</span>
          </div>
        ) : data?.orders && data.orders.length > 0 ? (
          <div className="divide-y divide-slate-100 relative">
            {isFetching && !isLoading && (
              <div className="absolute inset-0 bg-white/50 backdrop-blur-[0.5px] flex items-center justify-center z-10 pointer-events-none">
                <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
              </div>
            )}
            {data.orders.map((order) => (
              <div
                key={order.id}
                className="p-4 flex justify-between gap-3 hover:bg-slate-50 transition-colors"
                style={{
                  flexDirection: isMobile ? "column" : "row",
                  alignItems: isMobile ? "stretch" : "flex-start",
                }}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <h3 className="font-bold text-slate-900 truncate max-w-[160px] sm:max-w-xs">{order.id}</h3>
                    <span
                      className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium capitalize
                      ${
                        order.status === "pending"
                          ? "bg-amber-100 text-amber-800"
                          : order.status === "confirmed"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-green-100 text-green-800"
                      }`}
                    >
                      {order.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 truncate">
                    {new Date(order.createdAt).toLocaleDateString()} • {order.customerContact || "Unknown"}
                  </p>
                </div>

                <div
                  className="flex items-center gap-3 shrink-0"
                  style={{
                    width: isMobile ? "100%" : "auto",
                    justifyContent: isMobile ? "space-between" : "flex-end",
                  }}
                >
                  <div style={{ textAlign: isMobile ? "left" : "right" }}>
                    <p className="font-bold text-slate-900 text-sm">₹{order.totalAmount}</p>
                    <p className="text-xs text-slate-500">{order.itemCount} items</p>
                  </div>
                  <Link
                    href={`/orders/${order.id}`}
                    className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-3 py-2 cursor-pointer"
                  >
                    {isMobile ? "View" : "View Details"}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center">
            <h3 className="text-lg font-medium text-slate-900">
              No orders found
            </h3>
            <p className="text-slate-500 mt-1">
              {datePreset !== "all" || statusFilter !== "all"
                ? "No orders match the selected status and date range filters."
                : "When customers place orders, they will appear here."}
            </p>
            {(datePreset !== "all" || statusFilter !== "all") && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  handleClearDateFilter();
                  setStatusFilter("all");
                }}
                className="mt-4 text-xs"
              >
                Clear All Filters
              </Button>
            )}
          </div>
        )}
      </div>

      {/* ── Bottom Pagination Controls ── */}
      {totalOrders > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 bg-white rounded-xl border border-slate-200 shadow-sm text-sm">
          <div className="text-xs sm:text-sm text-slate-500 text-center sm:text-left">
            Showing <span className="font-semibold text-slate-900">{startOrder}</span> to{" "}
            <span className="font-semibold text-slate-900">{endOrder}</span> of{" "}
            <span className="font-semibold text-slate-900">{totalOrders}</span> orders
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(1)}
              disabled={page <= 1 || isLoading}
              className="h-8 w-8 p-0 cursor-pointer"
              title="First Page"
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(page - 1)}
              disabled={page <= 1 || isLoading}
              className="h-8 px-2.5 cursor-pointer text-xs gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Prev</span>
            </Button>

            <span className="px-3 text-xs sm:text-sm font-medium text-slate-700 whitespace-nowrap">
              Page <span className="font-semibold text-slate-900">{page}</span> of{" "}
              <span className="font-semibold text-slate-900">{totalPages}</span>
            </span>

            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(page + 1)}
              disabled={page >= totalPages || isLoading}
              className="h-8 px-2.5 cursor-pointer text-xs gap-1"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(totalPages)}
              disabled={page >= totalPages || isLoading}
              className="h-8 w-8 p-0 cursor-pointer"
              title="Last Page"
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
