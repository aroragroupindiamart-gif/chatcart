import { useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { useEffect, useRef } from "react";
import { getToken, setToken } from "@/lib/auth";
import { Spinner } from "@/components/ui/spinner";
import PendingActivation from "@/pages/PendingActivation";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [, setLocation] = useLocation();
  const token = getToken();

  const { data: user, isLoading, isError } = useGetMe({
    query: {
      enabled: !!token,
      retry: false,
      queryKey: getGetMeQueryKey(),
    },
  });

  useEffect(() => {
    if (!token || isError) {
      setLocation("/login");
    }
  }, [token, isError, setLocation]);

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

  return null;
}
