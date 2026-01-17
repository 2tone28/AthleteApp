'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseClient } from '@/lib/supabase/client'
import { Nav } from '@/components/layout/Nav'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { useToast } from '@/lib/toast'

export default function MessagesPage() {
  const router = useRouter()
  const supabase = createSupabaseClient()
  const { showToast } = useToast()
  const [conversations, setConversations] = useState<any[]>([])
  const [selectedConversation, setSelectedConversation] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [userRole, setUserRole] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [newMessage, setNewMessage] = useState('')

  useEffect(() => {
    loadConversations()
  }, [])

  useEffect(() => {
    if (selectedConversation) {
      loadMessages()
      const interval = setInterval(loadMessages, 5000) // Poll every 5 seconds
      return () => clearInterval(interval)
    }
  }, [selectedConversation])

  const loadConversations = async () => {
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

      setUserRole(userData?.role || null)

      let query = supabase
        .from('conversations')
        .select(`
          *,
          athlete:athlete_user_id (
            id,
            athlete_profiles (
              first_name,
              last_name,
              sport
            )
          ),
          coach:coach_user_id (
            id,
            coach_profiles (
              school,
              title
            )
          )
        `)
        .eq('status', 'OPEN')

      if (userData?.role === 'athlete') {
        query = query.eq('athlete_user_id', user.id)
      } else if (userData?.role === 'coach') {
        query = query.eq('coach_user_id', user.id)
      } else {
        setIsLoading(false)
        return
      }

      const { data, error } = await query.order('updated_at', { ascending: false })

      if (error) throw error
      setConversations(data || [])
    } catch (error: any) {
      showToast(error.message || 'Failed to load conversations', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const loadMessages = async () => {
    if (!selectedConversation) return

    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', selectedConversation.id)
        .order('created_at', { ascending: true })

      if (error) throw error
      setMessages(data || [])

      // Mark messages as read
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase
          .from('messages')
          .update({ read_at: new Date().toISOString() })
          .eq('conversation_id', selectedConversation.id)
          .neq('sender_user_id', user.id)
          .is('read_at', null)
      }
    } catch (error: any) {
      console.error('Error loading messages:', error)
    }
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const senderRole = userRole === 'athlete' ? 'ATHLETE' : 'COACH'

      const { error } = await supabase.from('messages').insert({
        conversation_id: selectedConversation.id,
        sender_user_id: user.id,
        sender_role: senderRole,
        body: newMessage.trim(),
      })

      if (error) throw error

      setNewMessage('')
      loadMessages()
      loadConversations() // Refresh to update updated_at

      // Create notification for recipient
      const recipientId = userRole === 'athlete' 
        ? selectedConversation.coach_user_id
        : selectedConversation.athlete_user_id

      await supabase.from('notifications').insert({
        user_id: recipientId,
        type: 'MESSAGE',
        title: 'New message',
        body: `You have a new message`,
        related_id: selectedConversation.id,
      })
    } catch (error: any) {
      showToast(error.message || 'Failed to send message', 'error')
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Nav />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center">Loading...</div>
        </div>
      </div>
    )
  }

  if (selectedConversation) {
    return (
      <ConversationView
        conversation={selectedConversation}
        messages={messages}
        userRole={userRole}
        newMessage={newMessage}
        setNewMessage={setNewMessage}
        onSend={sendMessage}
        onBack={() => setSelectedConversation(null)}
      />
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Conversations</h1>

        {conversations.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-gray-500 mb-4">
                {userRole === 'athlete' 
                  ? 'No conversations yet. Coaches will reach out to you here.'
                  : 'No conversations yet. Start a conversation from an athlete profile.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {conversations.map((conv) => {
              const otherUser = userRole === 'athlete' ? conv.coach : conv.athlete
              const otherProfile = userRole === 'athlete' 
                ? conv.coach?.coach_profiles?.[0]
                : conv.athlete?.athlete_profiles?.[0]

              return (
                <Card
                  key={conv.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setSelectedConversation(conv)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">
                          {userRole === 'athlete'
                            ? `${otherProfile?.school || 'Coach'} - ${otherProfile?.title || ''}`
                            : `${otherProfile?.first_name || ''} ${otherProfile?.last_name || ''}`}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {new Date(conv.updated_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant={conv.status === 'OPEN' ? 'success' : 'default'}>
                        {conv.status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function ConversationView({
  conversation,
  messages,
  userRole,
  newMessage,
  setNewMessage,
  onSend,
  onBack,
}: {
  conversation: any
  messages: any[]
  userRole: string | null
  newMessage: string
  setNewMessage: (msg: string) => void
  onSend: () => void
  onBack: () => void
}) {
  const otherUser = userRole === 'athlete' ? conversation.coach : conversation.athlete
  const otherProfile = userRole === 'athlete'
    ? conversation.coach?.coach_profiles?.[0]
    : conversation.athlete?.athlete_profiles?.[0]

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Button variant="ghost" onClick={onBack} className="mb-4">
          ← Back to Conversations
        </Button>

        <Card className="mb-4">
          <CardContent className="p-4">
            <h2 className="text-xl font-semibold">
              {userRole === 'athlete'
                ? `${otherProfile?.school || 'Coach'} - ${otherProfile?.title || ''}`
                : `${otherProfile?.first_name || ''} ${otherProfile?.last_name || ''}`}
            </h2>
          </CardContent>
        </Card>

        <Card className="mb-4" style={{ height: '500px', overflowY: 'auto' }}>
          <CardContent className="p-4">
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                No messages yet. Start the conversation!
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((msg) => {
                  const isOwn = msg.sender_role === (userRole === 'athlete' ? 'ATHLETE' : 'COACH')
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[70%] p-3 rounded-lg ${
                          isOwn
                            ? 'bg-primary-600 text-white'
                            : 'bg-gray-200 text-gray-900'
                        }`}
                      >
                        <p className="text-sm">{msg.body}</p>
                        <p className={`text-xs mt-1 ${isOwn ? 'text-primary-100' : 'text-gray-500'}`}>
                          {new Date(msg.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {userRole === 'athlete' && (
          <div className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && onSend()}
              placeholder="Type your message..."
              className="flex-1"
            />
            <Button onClick={onSend} disabled={!newMessage.trim()}>
              Send
            </Button>
          </div>
        )}

        {userRole === 'coach' && (
          <div className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && onSend()}
              placeholder="Type your message..."
              className="flex-1"
            />
            <Button onClick={onSend} disabled={!newMessage.trim()}>
              Send
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
