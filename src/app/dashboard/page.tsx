import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { Nav } from '@/components/layout/Nav'
import { Card, CardContent } from '@/components/ui/Card'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    redirect('/auth/signin')
  }

  const { data: user } = await supabase
    .from('users')
    .select('role')
    .eq('id', session.user.id)
    .single()

  if (!user) {
    redirect('/auth/signin')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
        
        {user.role === 'athlete' && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold mb-4">Your Feed</h2>
                <p className="text-gray-600 mb-4">
                  Discover schools and see your activity.
                </p>
                <Link href="/athlete-feed">
                  <Button>View Feed</Button>
                </Link>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold mb-4">Your Profile</h2>
                <p className="text-gray-600 mb-4">
                  Complete your profile to help coaches discover you.
                </p>
                <Link href="/profile">
                  <Button variant="outline">View Profile</Button>
                </Link>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold mb-4">Messages</h2>
                <p className="text-gray-600 mb-4">
                  View conversations with coaches.
                </p>
                <Link href="/messages">
                  <Button variant="outline">View Messages</Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        )}

        {user.role === 'coach' && (
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold mb-4">Search Athletes</h2>
                <p className="text-gray-600 mb-4">
                  Find talented athletes to recruit.
                </p>
                <Link href="/search">
                  <Button>Search Now</Button>
                </Link>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold mb-4">Saved Athletes</h2>
                <p className="text-gray-600 mb-4">
                  View your shortlist of athletes.
                </p>
                <Link href="/search?tab=saved">
                  <Button variant="outline">View Shortlist</Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
