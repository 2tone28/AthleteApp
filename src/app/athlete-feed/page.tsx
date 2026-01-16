'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseClient } from '@/lib/supabase/client'
import { Nav } from '@/components/layout/Nav'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import Link from 'next/link'

export default function AthleteFeedPage() {
  const router = useRouter()
  const supabase = createSupabaseClient()
  const [suggestedSchools, setSuggestedSchools] = useState<any[]>([])
  const [notifications, setNotifications] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [userRole, setUserRole] = useState<string | null>(null)

  useEffect(() => {
    loadFeed()
  }, [])

  const loadFeed = async () => {
    setIsLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/signin')
        return
      }

      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()

      if (userData?.role !== 'athlete') {
        router.push('/dashboard')
        return
      }

      setUserRole(userData.role)

      // Load suggested schools (schools not yet interested in)
      const { data: interests } = await supabase
        .from('athlete_school_interests')
        .select('school_id')
        .eq('athlete_user_id', user.id)

      const interestedSchoolIds = interests?.map(i => i.school_id) || []

      let schoolsQuery = supabase
        .from('schools')
        .select('*')
        .limit(6)
        .order('name')

      if (interestedSchoolIds.length > 0) {
        schoolsQuery = schoolsQuery.not('id', 'in', `(${interestedSchoolIds.join(',')})`)
      }

      const { data: schools } = await schoolsQuery

      setSuggestedSchools(schools || [])

      // Load recent notifications
      const { data: notifs } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10)

      setNotifications(notifs || [])
    } catch (error: any) {
      console.error('Error loading feed:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading || userRole !== 'athlete') {
    return (
      <div className="min-h-screen bg-gray-50">
        <Nav />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center">Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Your Feed</h1>

        {/* Notifications Section */}
        {notifications.length > 0 && (
          <Card className="mb-6">
            <CardContent className="p-4">
              <h2 className="text-lg font-semibold mb-3">Recent Activity</h2>
              <div className="space-y-2">
                {notifications.map((notif) => (
                  <div key={notif.id} className="p-3 bg-gray-50 rounded-lg">
                    <p className="font-medium text-sm">{notif.title}</p>
                    {notif.body && <p className="text-xs text-gray-600 mt-1">{notif.body}</p>}
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(notif.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
              <Link href="/notifications" className="mt-3 inline-block">
                <Button variant="ghost" size="sm">View All</Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Suggested Schools */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Suggested Schools</h2>
              <Link href="/schools">
                <Button variant="outline" size="sm">Browse All</Button>
              </Link>
            </div>
            {suggestedSchools.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No suggestions available</p>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {suggestedSchools.map((school) => (
                  <SchoolCard key={school.id} school={school} onInterestChange={loadFeed} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold mb-2">Your Interests</h3>
              <p className="text-sm text-gray-600 mb-4">
                Manage schools you're interested in
              </p>
              <Link href="/profile?tab=interests">
                <Button variant="outline" className="w-full">Manage Interests</Button>
              </Link>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold mb-2">Messages</h3>
              <p className="text-sm text-gray-600 mb-4">
                View conversations with coaches
              </p>
              <Link href="/messages">
                <Button variant="outline" className="w-full">View Messages</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function SchoolCard({ school, onInterestChange }: { school: any; onInterestChange: () => void }) {
  const supabase = createSupabaseClient()
  const [isInterested, setIsInterested] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleInterest = async () => {
    setIsLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      if (isInterested) {
        // Remove interest
        await supabase
          .from('athlete_school_interests')
          .delete()
          .eq('athlete_user_id', user.id)
          .eq('school_id', school.id)
      } else {
        // Add interest
        await supabase
          .from('athlete_school_interests')
          .insert({
            athlete_user_id: user.id,
            school_id: school.id,
            interest_type: 'LIKE',
            visibility: 'PUBLIC_TO_VERIFIED_COACHES',
          })
      }
      setIsInterested(!isInterested)
      onInterestChange()
    } catch (error) {
      console.error('Error updating interest:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card variant="outlined" className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="font-semibold">{school.name}</h3>
            {school.division && (
              <Badge variant="info" className="mt-1 text-xs">
                {school.division}
              </Badge>
            )}
            {school.location && (
              <p className="text-sm text-gray-600 mt-1">{school.location}</p>
            )}
          </div>
        </div>
        <Button
          size="sm"
          variant={isInterested ? 'secondary' : 'primary'}
          onClick={handleInterest}
          isLoading={isLoading}
          className="w-full"
        >
          {isInterested ? '✓ Interested' : '+ Show Interest'}
        </Button>
      </CardContent>
    </Card>
  )
}
