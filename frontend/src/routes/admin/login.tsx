import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useGoogleLogin } from '@react-oauth/google'
import { FcGoogle } from 'react-icons/fc'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { useAuth } from '@/hooks/useAuth'

export const Route = createFileRoute('/admin/login')({
  component: AdminLogin,
})

const loginSchema = z.object({
  email: z.email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

type LoginFormValues = z.infer<typeof loginSchema>

const REDIRECT = '/admin/messages'
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID

const inputClass =
  'h-11 rounded-xl border-0 bg-background/60 shadow-none focus-visible:ring-2 focus-visible:ring-ring/40'

function GoogleLoginButton({
  disabled,
  onError,
  onLoadingChange,
}: {
  disabled: boolean
  onError: (msg: string) => void
  onLoadingChange: (loading: boolean) => void
}) {
  const { socialLogin } = useAuth()
  const navigate = useNavigate()

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      onLoadingChange(true)
      try {
        await socialLogin({ provider: 'google', data: tokenResponse })
        navigate({ to: REDIRECT, replace: true })
      } catch {
        onError('Google login failed, please try again.')
      } finally {
        onLoadingChange(false)
      }
    },
    onError: () => {
      onError('OAuth error, please try again.')
      onLoadingChange(false)
    },
    scope: 'openid email profile',
  })

  return (
    <Button
      variant="outline"
      className="h-11 w-full rounded-xl border-0 bg-background/60 shadow-none hover:bg-background/80"
      disabled={disabled}
      onClick={() => googleLogin()}
      type="button"
    >
      <FcGoogle className="mr-2 size-5" />
      Continue with Google
    </Button>
  )
}

function AdminLogin() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { basicLogin, isAuthenticated } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (isAuthenticated) {
      navigate({ to: REDIRECT })
    }
  }, [isAuthenticated, navigate])

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  const onSubmit = async (values: LoginFormValues) => {
    setIsLoading(true)
    setError(null)
    try {
      await basicLogin(values.email, values.password)
      navigate({ to: REDIRECT, replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setIsLoading(false)
    }
  }

  const showAlternateLogins = GOOGLE_CLIENT_ID

  return (
    <div className="relative min-h-dvh flex flex-col items-center justify-center px-6 py-12 bg-background">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-80 overflow-hidden"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 50% -20%, oklch(0.96 0.012 194 / 0.55), transparent 70%), radial-gradient(ellipse 60% 50% at 50% 120%, oklch(0.35 0.06 194 / 0.2), transparent 70%)',
        }}
      />

      <div className="relative w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Welcome back
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sign in to manage your portfolio
          </p>
        </div>

        <div className="rounded-3xl bg-card/70 backdrop-blur-sm shadow-[0_8px_40px_-12px_rgb(0,0,0,0.15)] p-6 sm:p-8 space-y-5">
          {error && (
            <div
              role="alert"
              className="flex items-center justify-between gap-2 rounded-xl bg-destructive/10 px-3 py-2.5"
            >
              <p className="text-sm text-destructive">{error}</p>
              <Button
                onClick={() => setError(null)}
                variant="ghost"
                size="icon-sm"
                className="rounded-lg text-destructive hover:bg-destructive/10 hover:text-destructive"
                aria-label="Dismiss error"
              >
                <X className="size-3.5" />
              </Button>
            </div>
          )}

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-10 space-y-3">
              <div className="size-7 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              <p className="text-sm text-muted-foreground">Signing you in...</p>
            </div>
          ) : (
            <>
              {showAlternateLogins && (
                <>
                  <GoogleLoginButton
                    disabled={isLoading}
                    onError={setError}
                    onLoadingChange={setIsLoading}
                  />

                  <div className="relative flex items-center justify-center py-1">
                    <span className="text-xs text-muted-foreground px-2 bg-card/0">
                      or continue with email
                    </span>
                  </div>
                </>
              )}

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-medium text-muted-foreground">
                          Email
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="you@example.com"
                            autoComplete="email"
                            disabled={isLoading}
                            className={inputClass}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-medium text-muted-foreground">
                          Password
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="••••••••"
                            autoComplete="current-password"
                            disabled={isLoading}
                            className={inputClass}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="h-11 w-full rounded-xl shadow-none"
                    disabled={isLoading}
                  >
                    Sign in
                  </Button>
                </form>
              </Form>
            </>
          )}
        </div>

        <div className="mt-6 text-center">
          <Link
            to="/"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            &larr; Back to portfolio
          </Link>
        </div>
      </div>
    </div>
  )
}
