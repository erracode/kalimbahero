
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { signIn, signUp } from '../lib/auth-client'
import { useQueryClient } from '@tanstack/react-query'
import { AUTH_QUERY_KEY } from '../hooks/useAuth'
import { AuroraBackground } from '../components/ui/AuroraBackground'
import { GlassPanel } from '../components/ui/GlassPanel'
import { NeonButton } from '../components/ui/NeonButton'
import { Input } from '../components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../components/ui/form'
import { Loader2, Music, ArrowLeft } from 'lucide-react'

// Validation Schemas
const authSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  username: z.string().min(3, "Username must be at least 3 characters").optional(), // Only for signup
})

export const Route = createFileRoute('/auth')({
  component: AuthPage,
})

function AuthPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // Sign In Form
  const signInForm = useForm<z.infer<typeof authSchema>>({
    resolver: zodResolver(authSchema),
    defaultValues: { email: '', password: '' },
  })

  // Sign Up Form
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
          navigate({ to: '/' })
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
          navigate({ to: '/' })
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
    <div className="relative min-h-screen w-full overflow-hidden flex items-center justify-center p-4">
      {/* Background Layer */}
      <div className="absolute inset-0 z-0">
        <AuroraBackground />
      </div>

      {/* Back Button */}
      <div className="absolute top-8 left-8 z-20">
        <NeonButton
          variant="purple"
          size="sm"
          icon={<ArrowLeft className="w-4 h-4" />}
          onClick={() => navigate({ to: '/' })}
        >
          Main Menu
        </NeonButton>
      </div>

      {/* Content Layer */}
      <GlassPanel className="w-full max-w-md p-8 border-white/10 relative z-10 overflow-hidden">

        {/* Decorative Header */}
        <div className="text-center mb-8 relative z-10">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-cyan-500/20 rounded-full ring-2 ring-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.5)]">
              <Music className="w-8 h-8 text-cyan-400" />
            </div>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tighter drop-shadow-lg font-display">
            KALIMBA <span className="text-cyan-400">HERO</span>
          </h1>
          <p className="text-cyan-200/60 text-sm mt-2 font-medium tracking-wide">
            JOIN THE REVOLUTION
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-3 bg-red-500/20 border border-red-500/50 rounded-md text-red-200 text-sm text-center font-bold animate-pulse">
            {error}
          </div>
        )}

        <Tabs defaultValue="login" className="w-full relative z-10">
          <TabsList className="grid w-full grid-cols-2 mb-6 bg-black/40 border border-white/10">
            <TabsTrigger value="login" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400 font-bold uppercase tracking-wider">
              Login
            </TabsTrigger>
            <TabsTrigger value="signup" className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-400 font-bold uppercase tracking-wider">
              Sign Up
            </TabsTrigger>
          </TabsList>

          {/* LOGIN TAB */}
          <TabsContent value="login">
            <Form {...signInForm}>
              <form onSubmit={signInForm.handleSubmit(onSignIn)} className="space-y-4">
                <FormField
                  control={signInForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-cyan-100/80 font-bold uppercase text-xs tracking-widest">Email</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="hero@kalimba.com"
                          {...field}
                          className="bg-black/30 border-white/10 focus:border-cyan-500/50 text-white placeholder:text-white/20 h-10 transition-all focus:ring-1 focus:ring-cyan-500/50"
                        />
                      </FormControl>
                      <FormMessage className="text-red-400" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={signInForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-cyan-100/80 font-bold uppercase text-xs tracking-widest">Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="••••••••"
                          {...field}
                          className="bg-black/30 border-white/10 focus:border-cyan-500/50 text-white placeholder:text-white/20 h-10 transition-all focus:ring-1 focus:ring-cyan-500/50"
                        />
                      </FormControl>
                      <FormMessage className="text-red-400" />
                    </FormItem>
                  )}
                />

                <NeonButton
                  variant="cyan"
                  className="w-full mt-6 h-12 text-lg font-black tracking-widest"
                  disabled={isLoading}
                >
                  {isLoading ? <Loader2 className="animate-spin mr-2" /> : "ENTER STAGE"}
                </NeonButton>
              </form>
            </Form>
          </TabsContent>

          {/* SIGNUP TAB */}
          <TabsContent value="signup">
            <Form {...signUpForm}>
              <form onSubmit={signUpForm.handleSubmit(onSignUp)} className="space-y-4">
                <FormField
                  control={signUpForm.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-purple-100/80 font-bold uppercase text-xs tracking-widest">Username</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="KalimbaMaster"
                          {...field}
                          className="bg-black/30 border-white/10 focus:border-purple-500/50 text-white placeholder:text-white/20 h-10 transition-all focus:ring-1 focus:ring-purple-500/50"
                        />
                      </FormControl>
                      <FormMessage className="text-red-400" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={signUpForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-purple-100/80 font-bold uppercase text-xs tracking-widest">Email</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="you@rockstar.com"
                          {...field}
                          className="bg-black/30 border-white/10 focus:border-purple-500/50 text-white placeholder:text-white/20 h-10 transition-all focus:ring-1 focus:ring-purple-500/50"
                        />
                      </FormControl>
                      <FormMessage className="text-red-400" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={signUpForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-purple-100/80 font-bold uppercase text-xs tracking-widest">Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="••••••••"
                          {...field}
                          className="bg-black/30 border-white/10 focus:border-purple-500/50 text-white placeholder:text-white/20 h-10 transition-all focus:ring-1 focus:ring-purple-500/50"
                        />
                      </FormControl>
                      <FormMessage className="text-red-400" />
                    </FormItem>
                  )}
                />

                <NeonButton
                  variant="purple"
                  className="w-full mt-6 h-12 text-lg font-black tracking-widest"
                  disabled={isLoading}
                >
                  {isLoading ? <Loader2 className="animate-spin mr-2" /> : "START CAREER"}
                </NeonButton>
              </form>
            </Form>
          </TabsContent>
        </Tabs>

      </GlassPanel>
    </div>
  )
}
