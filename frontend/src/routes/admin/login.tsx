import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useGoogleLogin } from '@react-oauth/google'
import { FcGoogle } from 'react-icons/fc'
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
import { FormWrapper } from '@/components/forms/FormWrapper'
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

// Extracted so useGoogleLogin only runs when GoogleOAuthProvider is mounted
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
      className="w-full"
      disabled={disabled}
      onClick={() => googleLogin()}
      type="button"
      size="lg"
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
    <FormWrapper
      heading="Admin Login"
      subheading="Sign in to manage your portfolio"
      isLoading={isLoading}
      error={error}
      onErrorDismiss={() => setError(null)}
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    disabled={isLoading}
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
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    placeholder="Password"
                    disabled={isLoading}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" className="w-full" disabled={isLoading} size="lg">
            Sign In
          </Button>

          {showAlternateLogins && (
            <>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
                </div>
              </div>

              <GoogleLoginButton
                disabled={isLoading}
                onError={setError}
                onLoadingChange={setIsLoading}
              />
            </>
          )}
        </form>
      </Form>
    </FormWrapper>
  )
}
