import type { ReactNode } from 'react'
import { X, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Link } from '@tanstack/react-router'

interface FormWrapperProps {
  heading?: string
  subheading?: string
  children: ReactNode
  isLoading?: boolean
  error?: string | null
  onErrorDismiss?: () => void
}

export function FormWrapper({
  heading,
  subheading,
  children,
  isLoading = false,
  error = null,
  onErrorDismiss,
}: FormWrapperProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md mx-auto">
        <div className="text-center mb-8">
          <div className="mb-6 flex justify-center">
            <div className="p-4 bg-primary rounded-2xl shadow-md">
              <Shield className="w-10 h-10 text-primary-foreground" />
            </div>
          </div>
          {heading && (
            <h1 className="text-3xl font-bold text-foreground mb-2">{heading}</h1>
          )}
          {subheading && <p className="text-muted-foreground">{subheading}</p>}
        </div>

        <div className="bg-card border border-border rounded-2xl shadow-md p-6 space-y-4">
          {error && (
            <div className="flex items-center justify-between p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive">{error}</p>
              {onErrorDismiss && (
                <Button
                  onClick={onErrorDismiss}
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          )}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-muted-foreground text-sm">Loading...</p>
            </div>
          ) : (
            children
          )}
        </div>

        <div className="mt-6 text-center">
          <Link
            to="/"
            className="text-sm text-muted-foreground hover:text-foreground hover:underline"
          >
            &larr; Back to portfolio
          </Link>
        </div>
      </div>
    </div>
  )
}
