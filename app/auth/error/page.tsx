import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Film, AlertCircle } from 'lucide-react'
import Link from 'next/link'

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error: string }>
}) {
  const params = await searchParams

  return (
    <div className="flex min-h-svh w-full items-center justify-center bg-background p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-center gap-2">
            <Film className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold text-foreground">ClipStream</span>
          </div>
          <Card className="border-border bg-card">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                <AlertCircle className="h-6 w-6 text-destructive" />
              </div>
              <CardTitle className="text-2xl text-card-foreground">
                Something went wrong
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              {params?.error ? (
                <p className="text-sm text-muted-foreground">
                  Error: {params.error}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  An unspecified error occurred during authentication.
                </p>
              )}
              <div className="mt-6">
                <Link
                  href="/auth/login"
                  className="text-primary underline underline-offset-4 hover:text-primary/80"
                >
                  Back to sign in
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
