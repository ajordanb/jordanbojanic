import { useEffect, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { AlertCircle, Loader2 } from 'lucide-react'

type Status = 'verifying' | 'success' | 'error'

interface VerifyTokenGateProps {
  /**
   * The token to verify. If null/empty, the gate immediately shows the error state.
   */
  token: string | null | undefined
  /**
   * Verification call. Resolve = success, reject = failure.
   * Typically a mutation's mutateAsync.
   */
  onVerify: (token: string) => Promise<unknown>
  /**
   * Where to navigate after a successful verification.
   */
  redirectOnSuccess: string
  /**
   * Optional CTA shown in the error state.
   */
  errorCta?: {
    label: string
    href: string
  }
  /**
   * Title shown while verifying. Defaults to "Verifying your link...".
   */
  verifyingTitle?: string
  /**
   * Title shown on error. Defaults to "This link didn't work".
   */
  errorTitle?: string
}

/**
 * Generic UX shell for email-link verification flows. Handles verifying →
 * success (auto-navigate) → error (card with optional CTA). No domain
 * logic — the caller supplies the verify function and redirect target.
 * Reusable for thread magic links, passwordless login, etc.
 */
export function VerifyTokenGate({
  token,
  onVerify,
  redirectOnSuccess,
  errorCta,
  verifyingTitle = 'Verifying your link...',
  errorTitle = "This link didn't work",
}: VerifyTokenGateProps) {
  const [status, setStatus] = useState<Status>('verifying')
  const [errorMsg, setErrorMsg] = useState<string>('')
  const navigate = useNavigate()

  // Mount-once verification: the token comes from the URL when this route
  // loads, and on success we navigate away. Re-running on prop changes
  // would re-verify unnecessarily, so deps stay empty.
  useEffect(() => {
    if (!token) {
      setStatus('error')
      setErrorMsg('The link is missing its token.')
      return
    }

    let cancelled = false
    ;(async () => {
      try {
        await onVerify(token)
        if (cancelled) return
        setStatus('success')
        navigate({ to: redirectOnSuccess, replace: true })
      } catch (err) {
        if (cancelled) return
        setStatus('error')
        setErrorMsg(
          err instanceof Error
            ? err.message
            : 'The link is invalid or has expired.',
        )
      }
    })()

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 py-12 bg-background">
      <div className="w-full max-w-sm">
        <div className="rounded-3xl bg-card/70 backdrop-blur-sm shadow-[0_8px_40px_-12px_rgb(0,0,0,0.15)] p-8 text-center">
          {status === 'verifying' && (
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="size-8 text-primary animate-spin" />
              <p className="text-sm text-muted-foreground">{verifyingTitle}</p>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center gap-4">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
                <AlertCircle className="size-6" />
              </div>
              <div className="space-y-1">
                <h1 className="text-base font-semibold tracking-tight text-foreground">
                  {errorTitle}
                </h1>
                <p className="text-sm text-muted-foreground">{errorMsg}</p>
              </div>
              {errorCta && (
                <Link
                  to={errorCta.href}
                  className="mt-2 inline-flex items-center justify-center rounded-xl bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  {errorCta.label}
                </Link>
              )}
            </div>
          )}

          {status === 'success' && (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="size-6 text-primary animate-spin" />
              <p className="text-sm text-muted-foreground">Redirecting...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
