'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseClient } from '@/lib/supabase/client'
import { Nav } from '@/components/layout/Nav'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { athleteProfileSchema, highlightSchema, statSchema } from '@/lib/validation'
import { useToast } from '@/lib/toast'
import type { z } from 'zod'
import Link from 'next/link'

export default function ProfilePage() {
  const router = useRouter()
  const supabase = createSupabaseClient()
  const { showToast } = useToast()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [highlights, setHighlights] = useState<any[]>([])
  const [stats, setStats] = useState<any[]>([])
  const [isEditMode, setIsEditMode] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [showHighlightModal, setShowHighlightModal] = useState(false)
  const [showStatModal, setShowStatModal] = useState(false)

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) {
        router.push('/auth/signin')
        return
      }

      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single()

      setUser(userData)

      if (userData?.role === 'athlete') {
        const { data: profileData } = await supabase
          .from('athlete_profiles')
          .select('*')
          .eq('user_id', authUser.id)
          .single()

        setProfile(profileData)

        if (profileData) {
          const { data: highlightsData } = await supabase
            .from('athlete_highlights')
            .select('*')
            .eq('athlete_user_id', authUser.id)
            .order('created_at', { ascending: false })

          const { data: statsData } = await supabase
            .from('athlete_stats')
            .select('*')
            .eq('athlete_user_id', authUser.id)
            .order('created_at', { ascending: false })

          setHighlights(highlightsData || [])
          setStats(statsData || [])
        }
      } else if (userData?.role === 'coach') {
        const { data: profileData } = await supabase
          .from('coach_profiles')
          .select('*')
          .eq('user_id', authUser.id)
          .single()

        setProfile(profileData)
      }
    } catch (error: any) {
      showToast(error.message || 'Failed to load profile', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const { register, handleSubmit, formState: { errors }, reset } = useForm<z.infer<typeof athleteProfileSchema>>({
    resolver: zodResolver(athleteProfileSchema),
    values: profile || undefined,
  })

  const onProfileSubmit = async (data: z.infer<typeof athleteProfileSchema>) => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) return

      // Calculate completeness
      let completeness = 0
      const fields = ['first_name', 'last_name', 'sport', 'grad_year', 'city', 'state', 'gpa']
      fields.forEach(field => {
        if (data[field as keyof typeof data]) completeness += 14
      })
      if (data.positions && data.positions.length > 0) completeness += 14
      if (data.bio) completeness += 2

      const { error } = await supabase
        .from('athlete_profiles')
        .update({ ...data, profile_completeness: completeness })
        .eq('user_id', authUser.id)

      if (error) throw error

      showToast('Profile updated!', 'success')
      setIsEditMode(false)
      loadProfile()
    } catch (error: any) {
      showToast(error.message || 'Failed to update profile', 'error')
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

  if (!profile && user?.role === 'athlete') {
    return (
      <div className="min-h-screen bg-gray-50">
        <Nav />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Card>
            <CardContent className="p-8 text-center">
              <p className="mb-4">You haven't created your profile yet.</p>
              <Link href="/onboarding/athlete">
                <Button>Create Profile</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (user?.role === 'athlete') {
    return (
      <div className="min-h-screen bg-gray-50">
        <Nav />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">Your Profile</h1>
            {!isEditMode && (
              <Button onClick={() => setIsEditMode(true)}>Edit Profile</Button>
            )}
          </div>

          {isEditMode ? (
            <Card>
              <CardContent className="p-6">
                <form onSubmit={handleSubmit(onProfileSubmit)} className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <Input
                      label="First Name"
                      {...register('first_name')}
                      error={errors.first_name?.message}
                    />
                    <Input
                      label="Last Name"
                      {...register('last_name')}
                      error={errors.last_name?.message}
                    />
                  </div>
                  <Input
                    label="Sport"
                    {...register('sport')}
                    error={errors.sport?.message}
                  />
                  <Input
                    label="Graduation Year"
                    type="number"
                    {...register('grad_year', { valueAsNumber: true })}
                    error={errors.grad_year?.message}
                  />
                  <div className="grid md:grid-cols-2 gap-4">
                    <Input
                      label="City"
                      {...register('city')}
                      error={errors.city?.message}
                    />
                    <Input
                      label="State"
                      {...register('state')}
                      error={errors.state?.message}
                    />
                  </div>
                  <Input
                    label="GPA"
                    type="number"
                    step="0.01"
                    {...register('gpa', { valueAsNumber: true })}
                    error={errors.gpa?.message}
                  />
                  <div className="flex gap-4">
                    <Button type="submit">Save Changes</Button>
                    <Button type="button" variant="outline" onClick={() => setIsEditMode(false)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card className="mb-6">
                <CardContent className="p-6">
                  <h2 className="text-2xl font-semibold mb-4">
                    {profile?.first_name} {profile?.last_name}
                  </h2>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-gray-600">Sport</p>
                      <p className="font-medium">{profile?.sport || 'Not set'}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Graduation Year</p>
                      <p className="font-medium">{profile?.grad_year || 'Not set'}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Location</p>
                      <p className="font-medium">
                        {profile?.city && profile?.state
                          ? `${profile.city}, ${profile.state}`
                          : 'Not set'}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">GPA</p>
                      <p className="font-medium">{profile?.gpa || 'Not set'}</p>
                    </div>
                  </div>
                  {profile?.bio && (
                    <div className="mt-4">
                      <p className="text-gray-600 mb-2">Bio</p>
                      <p>{profile.bio}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="mb-6">
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <h2 className="text-xl font-semibold">Highlights</h2>
                    <Button size="sm" onClick={() => setShowHighlightModal(true)}>
                      Add Highlight
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {highlights.length === 0 ? (
                    <p className="text-gray-500">No highlights yet</p>
                  ) : (
                    <div className="space-y-2">
                      {highlights.map((highlight) => (
                        <div key={highlight.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                          <div>
                            <p className="font-medium">{highlight.title}</p>
                            <a href={highlight.url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary-600">
                              {highlight.url}
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <h2 className="text-xl font-semibold">Stats</h2>
                    <Button size="sm" onClick={() => setShowStatModal(true)}>
                      Add Stat
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {stats.length === 0 ? (
                    <p className="text-gray-500">No stats yet</p>
                  ) : (
                    <div className="space-y-2">
                      {stats.map((stat) => (
                        <div key={stat.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                          <div>
                            <p className="font-medium">
                              {stat.season} - {stat.stat_key}: {stat.stat_value}
                            </p>
                            <Badge variant={stat.verification_status === 'verified' ? 'success' : 'default'}>
                              {stat.verification_status === 'self_reported' ? 'Self-reported' :
                               stat.verification_status === 'source_provided' ? 'Source provided' : 'Verified'}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}

          <HighlightModal
            isOpen={showHighlightModal}
            onClose={() => setShowHighlightModal(false)}
            onSuccess={loadProfile}
          />

          <StatModal
            isOpen={showStatModal}
            onClose={() => setShowStatModal(false)}
            onSuccess={loadProfile}
          />
        </div>
      </div>
    )
  }

  // Coach profile view
  return (
    <div className="min-h-screen bg-gray-50">
      <Nav />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-6">
            <h2 className="text-2xl font-semibold mb-4">Coach Profile</h2>
            {profile ? (
              <div className="space-y-4">
                <div>
                  <p className="text-gray-600">School</p>
                  <p className="font-medium">{profile.school}</p>
                </div>
                <div>
                  <p className="text-gray-600">Title</p>
                  <p className="font-medium">{profile.title}</p>
                </div>
                <div>
                  <p className="text-gray-600">Verification Status</p>
                  <Badge
                    variant={
                      profile.verification_status === 'verified' ? 'success' :
                      profile.verification_status === 'rejected' ? 'danger' : 'warning'
                    }
                  >
                    {profile.verification_status}
                  </Badge>
                </div>
              </div>
            ) : (
              <Link href="/onboarding/coach">
                <Button>Complete Profile</Button>
              </Link>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function HighlightModal({ isOpen, onClose, onSuccess }: { isOpen: boolean; onClose: () => void; onSuccess: () => void }) {
  const supabase = createSupabaseClient()
  const { showToast } = useToast()
  const { register, handleSubmit, formState: { errors }, reset } = useForm<z.infer<typeof highlightSchema>>({
    resolver: zodResolver(highlightSchema),
  })

  const onSubmit = async (data: z.infer<typeof highlightSchema>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase.from('athlete_highlights').insert({
        athlete_user_id: user.id,
        ...data,
      })

      if (error) throw error

      showToast('Highlight added!', 'success')
      reset()
      onClose()
      onSuccess()
    } catch (error: any) {
      showToast(error.message || 'Failed to add highlight', 'error')
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Highlight">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Title"
          {...register('title')}
          error={errors.title?.message}
        />
        <Input
          label="URL"
          type="url"
          {...register('url')}
          error={errors.url?.message}
        />
        <div className="flex gap-4">
          <Button type="submit">Add</Button>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  )
}

function StatModal({ isOpen, onClose, onSuccess }: { isOpen: boolean; onClose: () => void; onSuccess: () => void }) {
  const supabase = createSupabaseClient()
  const { showToast } = useToast()
  const { register, handleSubmit, formState: { errors }, reset, watch, setValue } = useForm<z.infer<typeof statSchema>>({
    resolver: zodResolver(statSchema),
    defaultValues: {
      source_type: 'self_reported',
    },
  })

  const sourceType = watch('source_type')

  const onSubmit = async (data: z.infer<typeof statSchema>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const verificationStatus = data.source_type === 'self_reported' ? 'self_reported' : 'source_provided'

      const { error } = await supabase.from('athlete_stats').insert({
        athlete_user_id: user.id,
        ...data,
        verification_status: verificationStatus,
      })

      if (error) throw error

      showToast('Stat added!', 'success')
      reset()
      onClose()
      onSuccess()
    } catch (error: any) {
      showToast(error.message || 'Failed to add stat', 'error')
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Stat">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Season"
          {...register('season')}
          error={errors.season?.message}
          placeholder="e.g., 2023-2024"
        />
        <Input
          label="Stat Key"
          {...register('stat_key')}
          error={errors.stat_key?.message}
          placeholder="e.g., Points per game"
        />
        <Input
          label="Stat Value"
          {...register('stat_value')}
          error={errors.stat_value?.message}
          placeholder="e.g., 18.5"
        />
        <Select
          label="Source Type"
          options={[
            { value: 'self_reported', label: 'Self-reported' },
            { value: 'source_link', label: 'Source link' },
            { value: 'upload', label: 'Upload' },
          ]}
          {...register('source_type')}
          error={errors.source_type?.message}
        />
        {(sourceType === 'source_link' || sourceType === 'upload') && (
          <Input
            label="Source URL"
            type="url"
            {...register('source_url')}
            error={errors.source_url?.message}
            placeholder="Link to source or upload URL"
          />
        )}
        <div className="flex gap-4">
          <Button type="submit">Add</Button>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  )
}
