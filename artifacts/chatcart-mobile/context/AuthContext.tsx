import AsyncStorage from "@react-native-async-storage/async-storage";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

const TOKEN_KEY = "chatcart_token";

interface Seller {
  id: number;
  phone: string;
  storeName: string;
  subdomain: string;
  whatsappNumber: string;
}

interface AuthContextType {
  token: string | null;
  seller: Seller | null;
  isLoading: boolean;
  signIn: (token: string, seller: Seller) => Promise<void>;
  signOut: () => Promise<void>;
  setSeller: (seller: Seller) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [seller, setSeller] = useState<Seller | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(TOKEN_KEY).then((stored) => {
      if (stored) setToken(stored);
      setIsLoading(false);
    });
  }, []);

  useEffect(() => {
    setAuthTokenGetter(() => token);
  }, [token]);

  const signIn = useCallback(async (newToken: string, newSeller: Seller) => {
    await AsyncStorage.setItem(TOKEN_KEY, newToken);
    setToken(newToken);
    setSeller(newSeller);
  }, []);

  const signOut = useCallback(async () => {
    await AsyncStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setSeller(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ token, seller, isLoading, signIn, signOut, setSeller }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
