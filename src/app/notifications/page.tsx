'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseClient } from '@/lib/supabase/client'
import { Nav } from '@/components/layout/Nav'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { useToast } from '@/lib/toast'
import Link from 'next/link'

export default function NotificationsPage() {
  const router = useRouter()
  const supabase = createSupabaseClient()
  const { showToast } = useToast()
  const [notifications, setNotifications] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadNotifications()
  }, [])

  const loadNotifications = async () => {
    setIsLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/signin')
        return
      }

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error
      setNotifications(data || [])
    } catch (error: any) {
      showToast(error.message || 'Failed to load notifications', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', notificationId)

      if (error) throw error
      loadNotifications()
    } catch (error: any) {
      console.error('Error marking notification as read:', error)
    }
  }

  const handleNotificationClick = (notif: any) => {
    if (!notif.read_at) {
      markAsRead(notif.id)
    }

    if (notif.type === 'MESSAGE' && notif.related_id) {
      router.push(`/messages`)
    } else if (notif.type === 'CONTACT_REQUEST' && notif.related_id) {
      router.push(`/profile?tab=requests`)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Notifications</h1>

        {isLoading ? (
          <div className="text-center py-12">Loading...</div>
        ) : notifications.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-gray-500">No notifications yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {notifications.map((notif) => (
              <Card
                key={notif.id}
                className={`cursor-pointer hover:shadow-md transition-shadow ${
                  !notif.read_at ? 'border-l-4 border-primary-500' : ''
                }`}
                onClick={() => handleNotificationClick(notif)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{notif.title}</h3>
                        {!notif.read_at && (
                          <Badge variant="info" className="text-xs">New</Badge>
                        )}
                      </div>
                      {notif.body && (
                        <p className="text-sm text-gray-600 mb-2">{notif.body}</p>
                      )}
                      <p className="text-xs text-gray-400">
                        {new Date(notif.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
