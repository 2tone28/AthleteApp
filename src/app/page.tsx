import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function HomePage() {
  // Check if Supabase is configured
  let session = null
  const isConfigured = !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL && 
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

  if (isConfigured) {
    try {
      const supabase = await createServerSupabaseClient()
      const { data } = await supabase.auth.getSession()
      session = data.session
      
      if (session) {
        redirect('/dashboard')
      }
    } catch (error) {
      // If there's an error, just continue without session
      console.error('Supabase error:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {!isConfigured && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800 text-sm">
              <strong>Setup Required:</strong> Please add your Supabase credentials to <code className="bg-yellow-100 px-1 rounded">.env.local</code> file. 
              See README.md for instructions.
            </p>
          </div>
        )}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-4">
            AthleteConnect
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Connect high school athletes with college coaches. Showcase your talent, find your future.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-12">
          <Card variant="elevated">
            <CardContent className="p-8 text-center">
              <div className="text-5xl mb-4">🏃</div>
              <h2 className="text-2xl font-semibold mb-4">I'm an Athlete</h2>
              <p className="text-gray-600 mb-6">
                Create your profile, showcase your achievements, and connect with college coaches who are looking for talent like you.
              </p>
              <Link href="/auth/signup?role=athlete">
                <Button size="lg" className="w-full">
                  Get Started as Athlete
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card variant="elevated">
            <CardContent className="p-8 text-center">
              <div className="text-5xl mb-4">👔</div>
              <h2 className="text-2xl font-semibold mb-4">I'm a Coach</h2>
              <p className="text-gray-600 mb-6">
                Discover talented athletes, review profiles, and build your recruiting pipeline with verified athlete data.
              </p>
              <Link href="/auth/signup?role=coach">
                <Button size="lg" variant="secondary" className="w-full">
                  Get Started as Coach
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        <div className="text-center">
          <p className="text-gray-600 mb-4">
            Already have an account?
          </p>
          <Link href="/auth/signin">
            <Button variant="outline">Sign In</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
