'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseClient } from '@/lib/supabase/client'
import { Nav } from '@/components/layout/Nav'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { contactRequestSchema } from '@/lib/validation'
import { useToast } from '@/lib/toast'
import type { z } from 'zod'
import Link from 'next/link'

export default function InterestedAthletesPage() {
  const router = useRouter()
  const supabase = createSupabaseClient()
  const { showToast } = useToast()
  const [athletes, setAthletes] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCoach, setIsCoach] = useState(false)
  const [coachSchoolId, setCoachSchoolId] = useState<string | null>(null)
  const [selectedAthlete, setSelectedAthlete] = useState<any>(null)
  const [showContactModal, setShowContactModal] = useState(false)
  const [showMessageModal, setShowMessageModal] = useState(false)
  const [savedAthletes, setSavedAthletes] = useState<Set<string>>(new Set())

  useEffect(() => {
    checkCoachStatus()
    loadSavedAthletes()
  }, [])

  useEffect(() => {
    if (isCoach && coachSchoolId) {
      loadInterestedAthletes()
    } else if (isCoach && !coachSchoolId) {
      setIsLoading(false)
    }
  }, [isCoach, coachSchoolId])

  const checkCoachStatus = async () => {
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

      if (userData?.role !== 'coach') {
        router.push('/dashboard')
        return
      }

      const { data: coachProfile } = await supabase
        .from('coach_profiles')
        .select('verification_status, school_id')
        .eq('user_id', user.id)
        .single()

      if (coachProfile?.verification_status !== 'verified') {
        showToast('You must be a verified coach to view interested athletes', 'warning')
        router.push('/profile')
        return
      }

      setCoachSchoolId(coachProfile?.school_id || null)
      setIsCoach(true)
    } catch (error: any) {
      showToast(error.message || 'Failed to verify coach status', 'error')
    }
  }

  const loadSavedAthletes = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('saved_athletes')
        .select('athlete_user_id')
        .eq('coach_user_id', user.id)

      if (data) {
        setSavedAthletes(new Set(data.map(item => item.athlete_user_id)))
      }
    } catch (error) {
      // Silently fail
    }
  }

  const loadInterestedAthletes = async () => {
    setIsLoading(true)
    try {
      if (!coachSchoolId) {
        setIsLoading(false)
        setAthletes([])
        return
      }

      // Get all interests for this school
      const { data: interests, error: interestsError } = await supabase
        .from('athlete_school_interests')
        .select('athlete_user_id, interest_type, visibility, created_at')
        .eq('school_id', coachSchoolId)
        .or('visibility.eq.PUBLIC_TO_VERIFIED_COACHES,visibility.eq.PRIVATE_UNTIL_APPROVED')
        .order('created_at', { ascending: false })

      if (interestsError) {
        console.error('Error loading interests:', interestsError)
        throw interestsError
      }

      if (!interests || interests.length === 0) {
        setAthletes([])
        return
      }

      // Get unique athlete user IDs
      const athleteUserIds = [...new Set(interests.map((i: any) => i.athlete_user_id))]

      // Fetch athlete profiles
      // If no athlete IDs, skip the query
      if (athleteUserIds.length === 0) {
        setAthletes([])
        setIsLoading(false)
        return
      }

      const { data: athleteProfiles, error: profilesError } = await supabase
        .from('athlete_profiles')
        .select('*')
        .in('user_id', athleteUserIds)
        .eq('is_public', true)

      if (profilesError) {
        console.error('Error loading athlete profiles:', profilesError)
        throw profilesError
      }

      // Combine interests with athlete profiles
      const athletesWithInterests = (athleteProfiles || []).map((athlete: any) => {
        const interest = interests.find((i: any) => i.athlete_user_id === athlete.user_id)
        return {
          ...athlete,
          interest_type: interest?.interest_type || 'LIKE',
          interest_created_at: interest?.created_at,
          visibility: interest?.visibility || 'PUBLIC_TO_VERIFIED_COACHES',
        }
      })

      setAthletes(athletesWithInterests)
    } catch (error: any) {
      showToast(error.message || 'Failed to load interested athletes', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const toggleSave = async (athleteId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      if (savedAthletes.has(athleteId)) {
        await supabase
          .from('saved_athletes')
          .delete()
          .eq('coach_user_id', user.id)
          .eq('athlete_user_id', athleteId)
        setSavedAthletes(prev => {
          const next = new Set(prev)
          next.delete(athleteId)
          return next
        })
        showToast('Athlete removed from saved', 'success')
      } else {
        await supabase
          .from('saved_athletes')
          .insert({
            coach_user_id: user.id,
            athlete_user_id: athleteId,
          })
        setSavedAthletes(prev => new Set(prev).add(athleteId))
        showToast('Athlete saved', 'success')
      }
    } catch (error: any) {
      showToast(error.message || 'Failed to update saved status', 'error')
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Nav />
        <div className="max-w-6xl mx-auto px-4 py-8 pb-24 md:pb-8">
          <div className="text-center">Loading...</div>
        </div>
      </div>
    )
  }

  if (!isCoach || !coachSchoolId) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Nav />
        <div className="max-w-6xl mx-auto px-4 py-8 pb-24 md:pb-8">
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-gray-500 mb-4">You must be a verified coach with a school assigned to view interested athletes.</p>
              <Link href="/profile">
                <Button>Go to Profile</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav />
      <div className="max-w-6xl mx-auto px-4 py-8 pb-24 md:pb-8">
        <h1 className="text-3xl font-bold mb-6">Interested Athletes</h1>

        {athletes.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-gray-500 mb-4">No athletes have shown interest in your school yet.</p>
              <Link href="/search">
                <Button>Search for Athletes</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {athletes.map((athlete) => (
              <Card key={athlete.user_id} variant="elevated" className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="mb-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="text-lg font-semibold">
                          {athlete.first_name} {athlete.last_name}
                        </h3>
                        {athlete.sport && (
                          <Badge variant="info" className="mt-1">
                            {athlete.sport}
                          </Badge>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleSave(athlete.user_id)}
                      >
                        {savedAthletes.has(athlete.user_id) ? '★ Saved' : '☆ Save'}
                      </Button>
                    </div>
                    {athlete.positions && athlete.positions.length > 0 && (
                      <p className="text-sm text-gray-600 mb-1">
                        Positions: {athlete.positions.join(', ')}
                      </p>
                    )}
                    {athlete.grad_year && (
                      <p className="text-sm text-gray-600 mb-1">
                        Class of {athlete.grad_year}
                      </p>
                    )}
                    {athlete.city && athlete.state && (
                      <p className="text-sm text-gray-600 mb-1">
                        {athlete.city}, {athlete.state}
                      </p>
                    )}
                    {athlete.gpa && (
                      <p className="text-sm text-gray-600 mb-1">
                        GPA: {athlete.gpa}
                      </p>
                    )}
                    <div className="mt-2">
                      <Badge variant="success" className="text-xs">
                        {athlete.interest_type === 'LIKE' ? 'Liked' :
                         athlete.interest_type === 'FOLLOW' ? 'Following' :
                         athlete.interest_type === 'TOP_CHOICE' ? 'Top Choice' :
                         athlete.interest_type}
                      </Badge>
                      {athlete.visibility === 'PRIVATE_UNTIL_APPROVED' && (
                        <Badge variant="warning" className="text-xs ml-2">
                          Pending Approval
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/athlete/${athlete.user_id}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full">
                        View Profile
                      </Button>
                    </Link>
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedAthlete(athlete)
                        setShowMessageModal(true)
                      }}
                      className="flex-1"
                    >
                      Message
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <ContactModal
          isOpen={showContactModal}
          onClose={() => {
            setShowContactModal(false)
            setSelectedAthlete(null)
          }}
          athlete={selectedAthlete}
          onSuccess={() => {
            setShowContactModal(false)
            setSelectedAthlete(null)
          }}
        />

        <MessageModal
          isOpen={showMessageModal}
          onClose={() => {
            setShowMessageModal(false)
            setSelectedAthlete(null)
          }}
          athlete={selectedAthlete}
          onSuccess={() => {
            setShowMessageModal(false)
            setSelectedAthlete(null)
          }}
        />
      </div>
    </div>
  )
}

function ContactModal({
  isOpen,
  onClose,
  athlete,
  onSuccess,
}: {
  isOpen: boolean
  onClose: () => void
  athlete: any
  onSuccess: () => void
}) {
  const supabase = createSupabaseClient()
  const { showToast } = useToast()
  const { register, handleSubmit, formState: { errors }, reset } = useForm<z.infer<typeof contactRequestSchema>>({
    resolver: zodResolver(contactRequestSchema),
  })

  const onSubmit = async (data: z.infer<typeof contactRequestSchema>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !athlete) return

      // Create contact request or conversation
      const { error } = await supabase
        .from('conversations')
        .insert({
          coach_user_id: user.id,
          athlete_user_id: athlete.user_id,
          last_message_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (error && !error.message.includes('duplicate')) throw error

      showToast('Contact request sent!', 'success')
      reset()
      onSuccess()
    } catch (error: any) {
      showToast(error.message || 'Failed to send contact request', 'error')
    }
  }

  if (!athlete) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Contact ${athlete.first_name} ${athlete.last_name}`}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Message (Optional)
          </label>
          <textarea
            {...register('message')}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="Introduce yourself and express your interest..."
          />
          {errors.message && (
            <p className="text-red-500 text-sm mt-1">{errors.message.message}</p>
          )}
        </div>
        <div className="flex gap-4">
          <Button type="submit">Send Contact Request</Button>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  )
}

function MessageModal({
  isOpen,
  onClose,
  athlete,
  onSuccess,
}: {
  isOpen: boolean
  onClose: () => void
  athlete: any
  onSuccess: () => void
}) {
  const router = useRouter()
  const supabase = createSupabaseClient()
  const { showToast } = useToast()

  const handleStartConversation = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !athlete) return

      // Check if conversation already exists
      const { data: existingConv } = await supabase
        .from('conversations')
        .select('id')
        .eq('coach_user_id', user.id)
        .eq('athlete_user_id', athlete.user_id)
        .single()

      if (existingConv) {
        router.push(`/messages?conversation=${existingConv.id}`)
        onSuccess()
        return
      }

      // Create new conversation
      const { data: newConv, error } = await supabase
        .from('conversations')
        .insert({
          coach_user_id: user.id,
          athlete_user_id: athlete.user_id,
          last_message_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) throw error

      router.push(`/messages?conversation=${newConv.id}`)
      onSuccess()
    } catch (error: any) {
      showToast(error.message || 'Failed to start conversation', 'error')
    }
  }

  if (!athlete) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Message ${athlete.first_name} ${athlete.last_name}`}>
      <div className="space-y-4">
        <p className="text-gray-600">
          Start a conversation with {athlete.first_name} {athlete.last_name}?
        </p>
        <div className="flex gap-4">
          <Button onClick={handleStartConversation}>Start Conversation</Button>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  )
}
