// src/react/index.tsx
import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
var AuthContext = createContext(void 0);
function AuthProvider({ client, children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    let mounted = true;
    const unsubscribe = client.onAuthStateChanged(async (newSession) => {
      if (!mounted) return;
      setSession(newSession);
      if (newSession && newSession.access_token) {
        if (newSession.user) {
          setUser(newSession.user);
          setIsLoading(false);
        } else {
          try {
            const fetchedUser = await client.getUser();
            if (mounted) setUser(fetchedUser);
          } catch {
          } finally {
            if (mounted) setIsLoading(false);
          }
        }
      } else {
        setUser(null);
        setIsLoading(false);
      }
    });
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [client]);
  const login = useCallback(
    async (email, password) => {
      const sess = await client.login(email, password);
      return sess;
    },
    [client]
  );
  const logout = useCallback(async () => {
    await client.logout();
  }, [client]);
  const refreshUser = useCallback(async () => {
    const u = await client.getUser();
    setUser(u);
  }, [client]);
  const value = useMemo(
    () => ({
      client,
      session,
      user,
      isAuthenticated: !!session,
      isLoading,
      login,
      logout,
      refreshUser
    }),
    [client, session, user, isLoading, login, logout, refreshUser]
  );
  return /* @__PURE__ */ React.createElement(AuthContext.Provider, { value }, children);
}
function useAuth() {
  const context = useContext(AuthContext);
  if (context === void 0) {
    throw new Error("useAuth must be used within an <AuthProvider>");
  }
  return context;
}
export {
  AuthProvider,
  useAuth
};
