import React from 'react';
import { AuthClient, Session, User } from '../index.mjs';

interface AuthContextValue {
    /** The underlying AuthClient instance */
    client: AuthClient;
    /** The current session, or null if not authenticated */
    session: Session | null;
    /** The current user profile, or null if not authenticated */
    user: User | null;
    /** Whether the user is currently authenticated */
    isAuthenticated: boolean;
    /** Whether the auth state is still being determined (initial load) */
    isLoading: boolean;
    /** Convenience: login with email/password */
    login: (email: string, password: string) => Promise<Session>;
    /** Convenience: logout */
    logout: () => Promise<void>;
    /** Convenience: refresh the user profile from the server */
    refreshUser: () => Promise<void>;
}
interface AuthProviderProps {
    client: AuthClient;
    children: React.ReactNode;
}
declare function AuthProvider({ client, children }: AuthProviderProps): React.JSX.Element;
/**
 * Hook to access auth state and actions.
 * Must be used inside an `<AuthProvider>`.
 */
declare function useAuth(): AuthContextValue;

export { AuthProvider, useAuth };
