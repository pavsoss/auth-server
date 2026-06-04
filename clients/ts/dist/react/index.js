"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/react/index.tsx
var react_exports = {};
__export(react_exports, {
  AuthProvider: () => AuthProvider,
  useAuth: () => useAuth
});
module.exports = __toCommonJS(react_exports);
var import_react = __toESM(require("react"));
var AuthContext = (0, import_react.createContext)(void 0);
function AuthProvider({ client, children }) {
  const [session, setSession] = (0, import_react.useState)(null);
  const [user, setUser] = (0, import_react.useState)(null);
  const [isLoading, setIsLoading] = (0, import_react.useState)(true);
  (0, import_react.useEffect)(() => {
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
  const login = (0, import_react.useCallback)(
    async (email, password) => {
      const sess = await client.login(email, password);
      return sess;
    },
    [client]
  );
  const logout = (0, import_react.useCallback)(async () => {
    await client.logout();
  }, [client]);
  const refreshUser = (0, import_react.useCallback)(async () => {
    const u = await client.getUser();
    setUser(u);
  }, [client]);
  const value = (0, import_react.useMemo)(
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
  return /* @__PURE__ */ import_react.default.createElement(AuthContext.Provider, { value }, children);
}
function useAuth() {
  const context = (0, import_react.useContext)(AuthContext);
  if (context === void 0) {
    throw new Error("useAuth must be used within an <AuthProvider>");
  }
  return context;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  AuthProvider,
  useAuth
});
