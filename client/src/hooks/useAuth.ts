import { useQuery } from "@tanstack/react-query";
import { authClient } from "../lib/auth-client";

export const AUTH_QUERY_KEY = ["session"];

export function useAuth() {
    const { data: session, isPending, error, refetch } = useQuery({
        queryKey: AUTH_QUERY_KEY,
        queryFn: async () => {
            const res = await authClient.getSession();
            if (res.error) {
                return null;
            }
            return res.data;
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
    });

    return {
        session,
        user: session?.user,
        isPending,
        error,
        isAuthenticated: !!session,
        refetch
    };
}
