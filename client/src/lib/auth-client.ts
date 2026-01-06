
import { createAuthClient } from "better-auth/react"

export const authClient = createAuthClient({
    baseURL: "http://localhost:3000/api/auth" // Backend URL + Auth path
})

export const { signIn, signUp, useSession, signOut } = authClient;
