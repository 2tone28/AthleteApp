'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createSupabaseClient } from '@/lib/supabase/client'
import { Nav } from '@/components/layout/Nav'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { contactRequestSchema } from '@/lib/validation'
import { useToast } from '@/lib/toast'
import type { z } from 'zod'

export default function AthleteViewPage() {
  const router = useRouter()
  const params = useParams()
  const supabase = createSupabaseClient()
  const { showToast } = useToast()
  const [athlete, setAthlete] = useState<any>(null)
  const [highlights, setHighlights] = useState<any[]>([])
  const [stats, setStats] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCoach, setIsCoach] = useState(false)
  const [showContactModal, setShowContactModal] = useState(false)
  const [isSaved, setIsSaved] = useState(false)

  useEffect(() => {
    loadAthlete()
    checkCoachStatus()
  }, [params.id])

  const checkCoachStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()

      if (userData?.role === 'coach') {
        const { data: coachProfile } = await supabase
          .from('coach_profiles')
          .select('verification_status')
          .eq('user_id', user.id)
          .single()

        if (coachProfile?.verification_status === 'verified') {
          setIsCoach(true)
          checkSaved()
        }
      }
    } catch (error) {
      // Silently fail
    }
  }

  const checkSaved = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('saved_athletes')
        .select('id')
        .eq('coach_user_id', user.id)
        .eq('athlete_user_id', params.id)
        .single()

      setIsSaved(!!data)
    } catch (error) {
      setIsSaved(false)
    }
  }

  const loadAthlete = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('athlete_profiles')
        .select('*')
        .eq('user_id', params.id)
        .single()

      if (error) throw error
      setAthlete(data)

      const { data: highlightsData } = await supabase
        .from('athlete_highlights')
        .select('*')
        .eq('athlete_user_id', params.id)
        .order('created_at', { ascending: false })

      const { data: statsData } = await supabase
        .from('athlete_stats')
        .select('*')
        .eq('athlete_user_id', params.id)
        .order('created_at', { ascending: false })

      setHighlights(highlightsData || [])
      setStats(statsData || [])
    } catch (error: any) {
      showToast(error.message || 'Failed to load athlete profile', 'error')
      router.push('/search')
    } finally {
      setIsLoading(false)
    }
  }

  const toggleSave = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/signin')
        return
      }

      if (isSaved) {
        const { error } = await supabase
          .from('saved_athletes')
          .delete()
          .eq('coach_user_id', user.id)
          .eq('athlete_user_id', params.id)

        if (error) throw error
        setIsSaved(false)
        showToast('Removed from shortlist', 'success')
      } else {
        const { error } = await supabase
          .from('saved_athletes')
          .insert({
            coach_user_id: user.id,
            athlete_user_id: params.id as string,
          })

        if (error) throw error
        setIsSaved(true)
        showToast('Added to shortlist', 'success')
      }
    } catch (error: any) {
      showToast(error.message || 'Failed to update shortlist', 'error')
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Nav />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center">Loading...</div>
        </div>
      </div>
    )
  }

  if (!athlete) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Nav />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-gray-500">Athlete not found</p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold">
              {athlete.first_name} {athlete.last_name}
            </h1>
            <p className="text-gray-600 mt-1">{athlete.sport}</p>
          </div>
          {isCoach && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={toggleSave}>
                {isSaved ? '★ Saved' : '☆ Save'}
              </Button>
              <Button onClick={() => setShowContactModal(true)}>
                Contact
              </Button>
            </div>
          )}
        </div>

        <Card className="mb-6">
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold mb-4">Profile Information</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-gray-600">Graduation Year</p>
                <p className="font-medium">{athlete.grad_year || 'Not set'}</p>
              </div>
              <div>
                <p className="text-gray-600">Location</p>
                <p className="font-medium">
                  {athlete.city && athlete.state
                    ? `${athlete.city}, ${athlete.state}`
                    : 'Not set'}
                </p>
              </div>
              <div>
                <p className="text-gray-600">GPA</p>
                <p className="font-medium">{athlete.gpa || 'Not set'}</p>
              </div>
              {athlete.height_feet && athlete.height_inches && (
                <div>
                  <p className="text-gray-600">Height</p>
                  <p className="font-medium">
                    {athlete.height_feet}'{athlete.height_inches}"
                  </p>
                </div>
              )}
              {athlete.weight && (
                <div>
                  <p className="text-gray-600">Weight</p>
                  <p className="font-medium">{athlete.weight} lbs</p>
                </div>
              )}
            </div>
            {athlete.bio && (
              <div className="mt-4">
                <p className="text-gray-600 mb-2">Bio</p>
                <p>{athlete.bio}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {highlights.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <h2 className="text-xl font-semibold">Highlights</h2>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {highlights.map((highlight) => (
                  <div key={highlight.id} className="p-3 bg-gray-50 rounded">
                    <p className="font-medium mb-1">{highlight.title}</p>
                    <a
                      href={highlight.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary-600 hover:underline"
                    >
                      {highlight.url}
                    </a>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {stats.length > 0 && (
          <Card>
            <CardHeader>
              <h2 className="text-xl font-semibold">Stats</h2>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.map((stat) => (
                  <div key={stat.id} className="p-3 bg-gray-50 rounded">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">
                          {stat.season} - {stat.stat_key}: {stat.stat_value}
                        </p>
                        {stat.source_url && (
                          <a
                            href={stat.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary-600 hover:underline"
                          >
                            View source
                          </a>
                        )}
                      </div>
                      <Badge
                        variant={
                          stat.verification_status === 'verified'
                            ? 'success'
                            : stat.verification_status === 'source_provided'
                            ? 'info'
                            : 'default'
                        }
                      >
                        {stat.verification_status === 'self_reported'
                          ? 'Self-reported'
                          : stat.verification_status === 'source_provided'
                          ? 'Source provided'
                          : 'Verified'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <ContactModal
          isOpen={showContactModal}
          onClose={() => setShowContactModal(false)}
          athlete={athlete}
          onSuccess={() => setShowContactModal(false)}
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
