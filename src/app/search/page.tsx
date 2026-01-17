'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createSupabaseClient } from '@/lib/supabase/client'
import { Nav } from '@/components/layout/Nav'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { contactRequestSchema } from '@/lib/validation'
import { useToast } from '@/lib/toast'
import type { z } from 'zod'
import Link from 'next/link'

const SPORTS = [
  'Football', 'Basketball', 'Baseball', 'Soccer', 'Tennis', 'Track & Field',
  'Swimming', 'Volleyball', 'Softball', 'Golf', 'Wrestling', 'Lacrosse',
  'Cross Country', 'Other'
]

const STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
]

export default function SearchPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createSupabaseClient()
  const { showToast } = useToast()
  const [athletes, setAthletes] = useState<any[]>([])
  const [savedAthletes, setSavedAthletes] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const [selectedAthlete, setSelectedAthlete] = useState<any>(null)
  const [showContactModal, setShowContactModal] = useState(false)
  const [showMessageModal, setShowMessageModal] = useState(false)
  const [isCoach, setIsCoach] = useState(false)
  const [coachSchoolId, setCoachSchoolId] = useState<string | null>(null)
  const [filterInterestedInMySchool, setFilterInterestedInMySchool] = useState(false)

  useEffect(() => {
    checkCoachStatus()
    loadSavedAthletes()
  }, [])

  useEffect(() => {
    if (isCoach) {
      searchAthletes()
    }
  }, [isCoach, searchParams])

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
        showToast('You must be a verified coach to search athletes', 'warning')
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

  const searchAthletes = async () => {
    setIsLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      let query = supabase
        .from('athlete_profiles')
        .select('*')
        .eq('is_public', true)

      const sport = searchParams.get('sport')
      const state = searchParams.get('state')
      const gradYear = searchParams.get('grad_year')
      const minGpa = searchParams.get('min_gpa')
      const search = searchParams.get('search')

      if (sport) {
        query = query.eq('sport', sport)
      }
      if (state) {
        query = query.eq('state', state)
      }
      if (gradYear) {
        query = query.eq('grad_year', parseInt(gradYear))
      }
      if (minGpa) {
        query = query.gte('gpa', parseFloat(minGpa))
      }
      if (search) {
        query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%`)
      }

      const { data, error } = await query.limit(50)

      if (error) throw error

      let filteredData = data || []

      // If filtering by "interested in my school", fetch interests separately
      if (filterInterestedInMySchool && coachSchoolId) {
        const { data: interests } = await supabase
          .from('athlete_school_interests')
          .select('athlete_user_id, school_id, visibility')
          .eq('school_id', coachSchoolId)
          .or('visibility.eq.PUBLIC_TO_VERIFIED_COACHES,visibility.eq.PRIVATE_UNTIL_APPROVED')

        const interestedAthleteIds = new Set(
          (interests || []).map((i: any) => i.athlete_user_id)
        )

        filteredData = filteredData.filter((athlete: any) => 
          interestedAthleteIds.has(athlete.user_id)
        )
      }

      // Load interests for all athletes if coach wants to see them
      if (coachSchoolId && filteredData.length > 0) {
        const athleteUserIds = filteredData.map((a: any) => a.user_id)
        const { data: allInterests } = await supabase
          .from('athlete_school_interests')
          .select('athlete_user_id, school_id, interest_type, visibility')
          .in('athlete_user_id', athleteUserIds)

        // Add interests to athlete data
        filteredData = filteredData.map((athlete: any) => {
          const athleteInterests = (allInterests || []).filter(
            (i: any) => i.athlete_user_id === athlete.user_id
          )
          return {
            ...athlete,
            athlete_school_interests: athleteInterests,
          }
        })
      }

      setAthletes(filteredData)
    } catch (error: any) {
      showToast(error.message || 'Failed to search athletes', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const toggleSave = async (athleteUserId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const isSaved = savedAthletes.has(athleteUserId)

      if (isSaved) {
        const { error } = await supabase
          .from('saved_athletes')
          .delete()
          .eq('coach_user_id', user.id)
          .eq('athlete_user_id', athleteUserId)

        if (error) throw error
        setSavedAthletes(prev => {
          const next = new Set(prev)
          next.delete(athleteUserId)
          return next
        })
        showToast('Removed from shortlist', 'success')
      } else {
        const { error } = await supabase
          .from('saved_athletes')
          .insert({
            coach_user_id: user.id,
            athlete_user_id: athleteUserId,
          })

        if (error) throw error
        setSavedAthletes(prev => new Set([...prev, athleteUserId]))
        showToast('Added to shortlist', 'success')
      }
    } catch (error: any) {
      showToast(error.message || 'Failed to update shortlist', 'error')
    }
  }

  if (!isCoach) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Nav />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center">Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Search Athletes</h1>

        <Card className="mb-6">
          <CardContent className="p-6">
            <SearchFilters onSearch={searchAthletes} />
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="text-center py-12">Loading...</div>
        ) : athletes.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No athletes found. Try adjusting your filters.
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {athletes.map((athlete) => {
              const interests = athlete.athlete_school_interests || []
              const isInterestedInMySchool = coachSchoolId && interests.some((i: any) => 
                i.school_id === coachSchoolId &&
                (i.visibility === 'PUBLIC_TO_VERIFIED_COACHES' || i.visibility === 'PRIVATE_UNTIL_APPROVED')
              )

              return (
                <Card key={athlete.user_id} variant="elevated">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-xl font-semibold">
                            {athlete.first_name} {athlete.last_name}
                          </h3>
                          {isInterestedInMySchool && (
                            <Badge variant="success" className="text-xs">
                              Interested in your school
                            </Badge>
                          )}
                        </div>
                        <p className="text-gray-600">{athlete.sport}</p>
                      </div>
                      <button
                        onClick={() => toggleSave(athlete.user_id)}
                        className="text-gray-400 hover:text-primary-600"
                      >
                        {savedAthletes.has(athlete.user_id) ? '★' : '☆'}
                      </button>
                    </div>
                    <div className="space-y-2 mb-4">
                      {athlete.grad_year && (
                        <p className="text-sm">
                          <span className="text-gray-600">Grad Year:</span> {athlete.grad_year}
                        </p>
                      )}
                      {athlete.city && athlete.state && (
                        <p className="text-sm">
                          <span className="text-gray-600">Location:</span> {athlete.city}, {athlete.state}
                        </p>
                      )}
                      {athlete.gpa && (
                        <p className="text-sm">
                          <span className="text-gray-600">GPA:</span> {athlete.gpa}
                        </p>
                      )}
                      {interests.length > 0 && (
                        <p className="text-sm">
                          <span className="text-gray-600">Interested in:</span> {interests.length} school{interests.length !== 1 ? 's' : ''}
                        </p>
                      )}
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
                      >
                        Message
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
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

        <StartConversationModal
          isOpen={showMessageModal}
          onClose={() => {
            setShowMessageModal(false)
            setSelectedAthlete(null)
          }}
          athlete={selectedAthlete}
          onSuccess={() => {
            setShowMessageModal(false)
            setSelectedAthlete(null)
            router.push('/messages')
          }}
        />
      </div>
    </div>
  )
}

function SearchFilters({ 
  onSearch,
  filterInterestedInMySchool,
  setFilterInterestedInMySchool,
  coachSchoolId,
}: { 
  onSearch: () => void
  filterInterestedInMySchool: boolean
  setFilterInterestedInMySchool: (val: boolean) => void
  coachSchoolId: string | null
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [sport, setSport] = useState(searchParams.get('sport') || '')
  const [state, setState] = useState(searchParams.get('state') || '')
  const [gradYear, setGradYear] = useState(searchParams.get('grad_year') || '')
  const [minGpa, setMinGpa] = useState(searchParams.get('min_gpa') || '')

  const handleSearch = () => {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (sport) params.set('sport', sport)
    if (state) params.set('state', state)
    if (gradYear) params.set('grad_year', gradYear)
    if (minGpa) params.set('min_gpa', minGpa)
    router.push(`/search?${params.toString()}`)
    onSearch()
  }

  useEffect(() => {
    onSearch()
  }, [filterInterestedInMySchool])

  return (
    <div className="space-y-4">
      <Input
        label="Search by name"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Enter athlete name"
      />
      <div className="grid md:grid-cols-2 gap-4">
        <Select
          label="Sport"
          options={[{ value: '', label: 'All Sports' }, ...SPORTS.map(s => ({ value: s, label: s }))]}
          value={sport}
          onChange={(e) => setSport(e.target.value)}
        />
        <Select
          label="State"
          options={[{ value: '', label: 'All States' }, ...STATES.map(s => ({ value: s, label: s }))]}
          value={state}
          onChange={(e) => setState(e.target.value)}
        />
        <Select
          label="Graduation Year"
          options={[
            { value: '', label: 'All Years' },
            ...Array.from({ length: 6 }, (_, i) => {
              const year = new Date().getFullYear() + i
              return { value: year.toString(), label: year.toString() }
            }),
          ]}
          value={gradYear}
          onChange={(e) => setGradYear(e.target.value)}
        />
        <Input
          label="Minimum GPA"
          type="number"
          step="0.1"
          min="0"
          max="4.0"
          value={minGpa}
          onChange={(e) => setMinGpa(e.target.value)}
        />
      </div>
      {coachSchoolId && (
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="filter-interested"
            checked={filterInterestedInMySchool}
            onChange={(e) => setFilterInterestedInMySchool(e.target.checked)}
            className="w-4 h-4"
          />
          <label htmlFor="filter-interested" className="text-sm text-gray-700">
            Only show athletes interested in my school
          </label>
        </div>
      )}
      <Button onClick={handleSearch} className="w-full md:w-auto">
        Search
      </Button>
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

      const { error } = await supabase.from('contact_requests').insert({
        coach_user_id: user.id,
        athlete_user_id: athlete.user_id,
        message: data.message || null,
        status: 'pending',
      })

      if (error) throw error

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
            Message (optional)
          </label>
          <textarea
            {...register('message')}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="Introduce yourself and explain why you're reaching out..."
          />
          {errors.message && <p className="mt-1 text-sm text-red-600">{errors.message.message}</p>}
        </div>
        <div className="flex gap-4">
          <Button type="submit">Send Request</Button>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  )
}

function StartConversationModal({
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
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleStartConversation = async () => {
    setIsLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !athlete) return

      // Check if conversation already exists
      const { data: existing } = await supabase
        .from('conversations')
        .select('id')
        .eq('athlete_user_id', athlete.user_id)
        .eq('coach_user_id', user.id)
        .single()

      let conversationId

      if (existing) {
        conversationId = existing.id
      } else {
        // Create new conversation
        const { data: newConv, error: convError } = await supabase
          .from('conversations')
          .insert({
            athlete_user_id: athlete.user_id,
            coach_user_id: user.id,
            initiated_by: user.id,
            status: 'OPEN',
          })
          .select('id')
          .single()

        if (convError) throw convError
        conversationId = newConv.id
      }

      // Send initial message if provided
      if (message.trim()) {
        const { error: msgError } = await supabase.from('messages').insert({
          conversation_id: conversationId,
          sender_user_id: user.id,
          sender_role: 'COACH',
          body: message.trim(),
        })

        if (msgError) throw msgError
      }

      // Create notification for athlete
      await supabase.from('notifications').insert({
        user_id: athlete.user_id,
        type: 'MESSAGE',
        title: 'New conversation',
        body: `A coach started a conversation with you`,
        related_id: conversationId,
      })

      showToast('Conversation started!', 'success')
      setMessage('')
      onSuccess()
    } catch (error: any) {
      showToast(error.message || 'Failed to start conversation', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  if (!athlete) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Message ${athlete.first_name} ${athlete.last_name}`}>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Initial Message (optional)
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="Introduce yourself and start the conversation..."
          />
        </div>
        <div className="flex gap-4">
          <Button onClick={handleStartConversation} isLoading={isLoading}>
            Start Conversation
          </Button>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  )
}
