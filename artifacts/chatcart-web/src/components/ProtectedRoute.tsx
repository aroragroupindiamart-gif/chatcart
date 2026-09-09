import { useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { useEffect, useRef } from "react";
import { getToken, setToken } from "@/lib/auth";
import { Spinner } from "@/components/ui/spinner";
import PendingActivation from "@/pages/PendingActivation";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [, setLocation] = useLocation();
  const token = getToken();

  const { data: user, isLoading, isError, error } = useGetMe({
    query: {
      enabled: !!token,
      retry: 2,
      queryKey: getGetMeQueryKey(),
    },
  });

  useEffect(() => {
    if (!token) {
      setLocation("/login");
      return;
    }
    if (isError) {
      const status = (error as any)?.status || (error as any)?.response?.status;
      if (status === 401 || status === 403) {
        setLocation("/login");
      }
    }
  }, [token, isError, error, setLocation]);

  const refreshedRef = useRef(false);
  useEffect(() => {
    if (user && token && !refreshedRef.current) {
      refreshedRef.current = true;
      fetch("/api/auth/token/refresh", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => { if (d?.token) setToken(d.token); })
        .catch(() => {});
    }
  }, [(user as any)?.id]);

  if (isLoading || !token) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <Spinner className="w-8 h-8 text-primary" />
      </div>
    );
  }

  if (user) {
    if ((user as any).subscriptionPlan === "pending") {
      return <PendingActivation />;
    }
    return <>{children}</>;
  }

  if (isError) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center gap-3 text-muted-foreground p-4 text-center">
        <p className="text-sm">Unable to connect to server. Reconnecting...</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-primary text-primary-foreground text-xs rounded-md font-medium hover:bg-primary/90"
        >
          Reload Page
        </button>
      </div>
    );
  }

  return null;
}
