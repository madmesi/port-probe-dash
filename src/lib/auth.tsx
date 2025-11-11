import { createContext, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "@/lib/api";

interface User {
  id: string;
  email: string;
  username: string;
  display_name?: string;
  approved: boolean;
}

interface AuthContextType {
  user: User | null;
  session: string | null;
  isAdmin: boolean;
  isApproved: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, username: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isApproved, setIsApproved] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Check for existing token
    const token = localStorage.getItem('auth_token');
    if (token) {
      apiClient.setToken(token);
      fetchCurrentUser();
    } else {
      setIsLoading(false);
    }
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const data = await apiClient.getCurrentUser();
      setUser(data.user);
      setSession(localStorage.getItem('auth_token'));
      setIsAdmin(data.roles?.includes('admin') ?? false);
      setIsApproved(data.user.approved);
    } catch (error) {
      // Token is invalid, clear it
      apiClient.setToken(null);
      setUser(null);
      setSession(null);
      setIsAdmin(false);
      setIsApproved(false);
    } finally {
      setIsLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const data = await apiClient.login(email, password);
      // Persist token first
      apiClient.setToken(data.token);
      setSession(data.token);
      // Fetch authoritative user + roles from backend using the stored token
      await fetchCurrentUser();
      navigate("/");
      return { error: null };
    } catch (error: any) {
      return { error: { message: error.message } };
    }
  };

  const signUp = async (email: string, password: string, username: string) => {
    try {
      const data = await apiClient.signUp(email, password, username);
      apiClient.setToken(data.token);
      setUser(data.user);
      setSession(data.token);
      setIsAdmin(false);
      setIsApproved(data.user.approved);
      navigate("/");
      return { error: null };
    } catch (error: any) {
      return { error: { message: error.message } };
    }
  };

  const signOut = async () => {
    try {
      await apiClient.logout();
    } catch (error) {
      // Ignore logout errors
    }
    apiClient.setToken(null);
    setUser(null);
    setSession(null);
    setIsAdmin(false);
    setIsApproved(false);
    navigate("/auth");
  };

  return (
    <AuthContext.Provider value={{ user, session, isAdmin, isApproved, isLoading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
