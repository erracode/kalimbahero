import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { signIn, signUp } from '@/lib/auth-client'
import { useQueryClient } from '@tanstack/react-query'
import { AUTH_QUERY_KEY } from '@/hooks/useAuth'
import { NeonButton } from '@/components/ui/NeonButton'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Loader2, Gamepad2 } from 'lucide-react'
import { motion } from 'framer-motion'

// Validation Schemas
const authSchema = z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    username: z.string().min(3, "Username must be at least 3 characters").optional(),
})

interface AuthPanelProps {
    onAuthSuccess: () => void;
}

export function AuthPanel({ onAuthSuccess }: AuthPanelProps) {
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')
    const queryClient = useQueryClient()

    const signInForm = useForm<z.infer<typeof authSchema>>({
        resolver: zodResolver(authSchema),
        defaultValues: { email: '', password: '' },
    })

    const signUpForm = useForm<z.infer<typeof authSchema>>({
        resolver: zodResolver(authSchema),
        defaultValues: { email: '', password: '', username: '' },
    })

    async function onSignIn(values: z.infer<typeof authSchema>) {
        setIsLoading(true)
        setError('')
        try {
            await signIn.email({
                email: values.email,
                password: values.password,
            }, {
                onSuccess: () => {
                    queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEY })
                    onAuthSuccess()
                },
                onError: (ctx) => {
                    setError(ctx.error.message)
                    setIsLoading(false)
                }
            })
        } catch (err) {
            setError("An unexpected error occurred")
            setIsLoading(false)
        }
    }

    async function onSignUp(values: z.infer<typeof authSchema>) {
        if (!values.username) return;
        setIsLoading(true)
        setError('')
        try {
            await signUp.email({
                email: values.email,
                password: values.password,
                name: values.username,
            }, {
                onSuccess: () => {
                    queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEY })
                    onAuthSuccess()
                },
                onError: (ctx) => {
                    setError(ctx.error.message)
                    setIsLoading(false)
                }
            })
        } catch (err) {
            setError("An unexpected error occurred")
            setIsLoading(false)
        }
    }

    return (
        <div className="w-full text-white">
            {/* Header */}
            <div className="text-center mb-10">
                <div className="flex justify-center mb-6">
                    <div className="p-5 bg-gradient-to-br from-cyan-900/20 to-purple-900/20 rounded-none border border-white/5 shadow-[0_0_20px_rgba(6,182,212,0.1)] transform rotate-45">
                        <Gamepad2 className="w-10 h-10 text-white transform -rotate-45" />
                    </div>
                </div>
                <h1 className="text-4xl font-black text-white italic tracking-tighter font-display uppercase mb-2">
                    Log <span className="text-cyan-400">In</span>
                </h1>
                <p className="text-white/40 text-xs font-bold tracking-[0.3em] uppercase">
                    Save your progress & tones
                </p>
            </div>

            {/* Error Message */}
            {error && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6 p-4 bg-red-500/10 border-l-2 border-red-500 text-red-200 text-xs font-bold uppercase tracking-wide flex items-center gap-2"
                >
                    <span>⚠️</span> {error}
                </motion.div>
            )}

            <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-8 bg-black/40 border border-white/10 rounded-none skew-x-[-12deg] p-1 h-14">
                    <TabsTrigger
                        value="login"
                        className="data-[state=active]:bg-cyan-600 data-[state=active]:text-white data-[state=active]:shadow-lg text-white/40 text-xs font-black italic uppercase tracking-widest rounded-none h-full transition-all cursor-pointer"
                    >
                        <span className="skew-x-[12deg]">Login</span>
                    </TabsTrigger>
                    <TabsTrigger
                        value="signup"
                        className="data-[state=active]:bg-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg text-white/40 text-xs font-black italic uppercase tracking-widest rounded-none h-full transition-all cursor-pointer"
                    >
                        <span className="skew-x-[12deg]">Register</span>
                    </TabsTrigger>
                </TabsList>

                {/* LOGIN TAB */}
                <TabsContent value="login" className="focus-visible:outline-none focus-visible:ring-0">
                    <Form {...signInForm}>
                        <form onSubmit={signInForm.handleSubmit(onSignIn)} className="space-y-6">
                            <FormField
                                control={signInForm.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-cyan-400 font-bold uppercase text-[10px] tracking-widest pl-1">Email</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="hero@kalimba.com"
                                                {...field}
                                                className="-skew-x-[12deg] bg-black/40 border-white/10 focus:border-cyan-500 text-white placeholder:text-white/10 h-12 rounded-none transition-all focus:ring-1 focus:ring-cyan-500/50"
                                            />
                                        </FormControl>
                                        <FormMessage className="text-red-400 text-xs font-bold uppercase" />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={signInForm.control}
                                name="password"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-cyan-400 font-bold uppercase text-[10px] tracking-widest pl-1">Password</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="password"
                                                placeholder="••••••••"
                                                {...field}
                                                className="-skew-x-[12deg] bg-black/40 border-white/10 focus:border-cyan-500 text-white placeholder:text-white/10 h-12 rounded-none transition-all focus:ring-1 focus:ring-cyan-500/50"
                                            />
                                        </FormControl>
                                        <FormMessage className="text-red-400 text-xs font-bold uppercase" />
                                    </FormItem>
                                )}
                            />

                            <NeonButton
                                variant="cyan"
                                fullWidth
                                className="mt-8 h-14 text-xl font-black italic tracking-widest uppercase hover:scale-[1.02] active:scale-[0.98] transition-transform shadow-[0_0_20px_rgba(6,182,212,0.2)]"
                                disabled={isLoading}
                            >
                                {isLoading ? <Loader2 className="animate-spin" /> : "ENTER STUDIO"}
                            </NeonButton>
                        </form>
                    </Form>
                </TabsContent>

                {/* SIGNUP TAB */}
                <TabsContent value="signup" className="focus-visible:outline-none focus-visible:ring-0">
                    <Form {...signUpForm}>
                        <form onSubmit={signUpForm.handleSubmit(onSignUp)} className="space-y-6">
                            <FormField
                                control={signUpForm.control}
                                name="username"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-purple-400 font-bold uppercase text-[10px] tracking-widest pl-1">Stage Name</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="KalimbaMaster"
                                                {...field}
                                                className="bg-black/40 border-white/10 focus:border-purple-500 text-white placeholder:text-white/10 h-12 rounded-none transition-all focus:ring-1 focus:ring-purple-500/50"
                                            />
                                        </FormControl>
                                        <FormMessage className="text-red-400 text-xs font-bold uppercase" />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={signUpForm.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-purple-400 font-bold uppercase text-[10px] tracking-widest pl-1">Email</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="you@rockstar.com"
                                                {...field}
                                                className="bg-black/40 border-white/10 focus:border-purple-500 text-white placeholder:text-white/10 h-12 rounded-none transition-all focus:ring-1 focus:ring-purple-500/50"
                                            />
                                        </FormControl>
                                        <FormMessage className="text-red-400 text-xs font-bold uppercase" />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={signUpForm.control}
                                name="password"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-purple-400 font-bold uppercase text-[10px] tracking-widest pl-1">Password</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="password"
                                                placeholder="••••••••"
                                                {...field}
                                                className="bg-black/40 border-white/10 focus:border-purple-500 text-white placeholder:text-white/10 h-12 rounded-none transition-all focus:ring-1 focus:ring-purple-500/50"
                                            />
                                        </FormControl>
                                        <FormMessage className="text-red-400 text-xs font-bold uppercase" />
                                    </FormItem>
                                )}
                            />

                            <NeonButton
                                variant="purple"
                                fullWidth
                                className="mt-8 h-14 text-xl font-black italic tracking-widest uppercase hover:scale-[1.02] active:scale-[0.98] transition-transform shadow-[0_0_20px_rgba(168,85,247,0.2)]"
                                disabled={isLoading}
                            >
                                {isLoading ? <Loader2 className="animate-spin" /> : "JOIN BAND"}
                            </NeonButton>
                        </form>
                    </Form>
                </TabsContent>
            </Tabs>
        </div>
    )
}
