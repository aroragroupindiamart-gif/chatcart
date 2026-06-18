import { useGetMe } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { getToken } from "@/lib/auth";
import { Spinner } from "@/components/ui/spinner";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [, setLocation] = useLocation();
  const token = getToken();

  const { data: user, isLoading, isError } = useGetMe({
    query: {
      enabled: !!token,
      retry: false,
    },
  });

  useEffect(() => {
    if (!token || isError) {
      setLocation("/login");
    }
  }, [token, isError, setLocation]);

  if (isLoading || !token) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <Spinner className="w-8 h-8 text-primary" />
      </div>
    );
  }

  if (user) {
    return <>{children}</>;
  }

  return null;
}
