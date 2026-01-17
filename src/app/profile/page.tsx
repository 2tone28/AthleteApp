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
import { athleteProfileSchema, highlightSchema, statSchema, campSchema, coachProfileSchema } from '@/lib/validation'
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
  const [schoolInterests, setSchoolInterests] = useState<any[]>([])
  const [isEditMode, setIsEditMode] = useState(false)
  const [isCoachEditMode, setIsCoachEditMode] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [showHighlightModal, setShowHighlightModal] = useState(false)
  const [showStatModal, setShowStatModal] = useState(false)
  const [showCampModal, setShowCampModal] = useState(false)
  const [editingCampIndex, setEditingCampIndex] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState<string>('profile')
  const [camps, setCamps] = useState<any[]>([])

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

          const { data: interestsData } = await supabase
            .from('athlete_school_interests')
            .select(`
              *,
              schools (*)
            `)
            .eq('athlete_user_id', authUser.id)
            .order('created_at', { ascending: false })

          setHighlights(highlightsData || [])
          setStats(statsData || [])
          setSchoolInterests(interestsData || [])
        }
      } else if (userData?.role === 'coach') {
        const { data: profileData } = await supabase
          .from('coach_profiles')
          .select('*')
          .eq('user_id', authUser.id)
          .single()

        setProfile(profileData)
        if (profileData?.camps) {
          setCamps(Array.isArray(profileData.camps) ? profileData.camps : [])
        }
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

  const { register: registerCoach, handleSubmit: handleCoachSubmit, formState: { errors: coachErrors }, watch: watchCoach, setValue: setCoachValue, reset: resetCoach } = useForm<z.infer<typeof coachProfileSchema>>({
    resolver: zodResolver(coachProfileSchema),
    defaultValues: {
      first_name: profile?.first_name || '',
      last_name: profile?.last_name || '',
      school: profile?.school || '',
      title: profile?.title || '',
      what_we_are_looking_for: profile?.what_we_are_looking_for || '',
    },
  })

  // Update coach form when profile changes
  useEffect(() => {
    if (user?.role === 'coach' && profile) {
      resetCoach({
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        school: profile.school || '',
        title: profile.title || '',
        what_we_are_looking_for: profile.what_we_are_looking_for || '',
      })
      if (profile.camps) {
        setCamps(Array.isArray(profile.camps) ? profile.camps : [])
      }
    }
  }, [profile, user?.role, resetCoach])

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
        <div className="max-w-4xl mx-auto px-4 py-8 pb-24 md:pb-8">
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
              {/* Profile Header */}
              <Card className="mb-6">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h2 className="text-2xl font-semibold mb-2">
                        {profile?.first_name} {profile?.last_name}
                      </h2>
                      <div className="flex items-center gap-2 mb-2">
                        {profile?.sport && (
                          <Badge variant="info">{profile.sport}</Badge>
                        )}
                        {profile?.positions && profile.positions.length > 0 && (
                          <Badge variant="default">
                            {profile.positions.join(', ')}
                          </Badge>
                        )}
                        {profile?.grad_year && (
                          <Badge variant="default">Class of {profile.grad_year}</Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Link href="/schools">
                        <Button variant="outline" size="sm">Browse Schools</Button>
                      </Link>
                    </div>
                  </div>
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

              {/* School Interests Section */}
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <h2 className="text-xl font-semibold">Interested Schools</h2>
                    <Link href="/schools">
                      <Button size="sm" variant="outline">Browse Schools</Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  {schoolInterests.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500 mb-4">No school interests yet</p>
                      <Link href="/schools">
                        <Button>Browse Schools</Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {schoolInterests.map((interest) => (
                        <Card key={interest.id} variant="outlined">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <h3 className="font-semibold">{interest.schools?.name}</h3>
                                {interest.schools?.division && (
                                  <Badge variant="info" className="mt-1 text-xs">
                                    {interest.schools.division}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="mt-2">
                              <Badge variant="success" className="text-xs">
                                {interest.interest_type}
                              </Badge>
                              <p className="text-xs text-gray-500 mt-1">
                                {interest.visibility === 'PUBLIC_TO_VERIFIED_COACHES' ? 'Visible to coaches' :
                                 interest.visibility === 'PRIVATE_UNTIL_APPROVED' ? 'Private until approved' :
                                 'Private'}
                              </p>
                            </div>
                          </CardContent>
                        </Card>
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
  const onCoachProfileSubmit = async (data: any) => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) return

      const { error } = await supabase
        .from('coach_profiles')
        .update({
          first_name: data.first_name,
          last_name: data.last_name,
          school: data.school,
          title: data.title,
          what_we_are_looking_for: data.what_we_are_looking_for,
          camps: camps,
        })
        .eq('user_id', authUser.id)

      if (error) throw error

      showToast('Profile updated!', 'success')
      setIsCoachEditMode(false)
      loadProfile()
    } catch (error: any) {
      showToast(error.message || 'Failed to update profile', 'error')
    }
  }

  const handleAddCamp = (camp: any) => {
    if (editingCampIndex !== null) {
      const newCamps = [...camps]
      newCamps[editingCampIndex] = camp
      setCamps(newCamps)
      setEditingCampIndex(null)
    } else {
      setCamps([...camps, camp])
    }
    setShowCampModal(false)
  }

  const handleRemoveCamp = (index: number) => {
    setCamps(camps.filter((_, i) => i !== index))
  }

  const handleEditCamp = (index: number) => {
    setEditingCampIndex(index)
    setShowCampModal(true)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav />
      <div className="max-w-4xl mx-auto px-4 py-8 pb-24 md:pb-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Coach Profile</h1>
          {profile && !isCoachEditMode && (
            <Button onClick={() => setIsCoachEditMode(true)}>Edit Profile</Button>
          )}
        </div>

        {!profile ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Link href="/onboarding/coach">
                <Button>Complete Profile</Button>
              </Link>
            </CardContent>
          </Card>
        ) : isCoachEditMode ? (
          <Card>
            <CardContent className="p-6">
              <form onSubmit={handleCoachSubmit(onCoachProfileSubmit)} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <Input
                    label="First Name"
                    {...registerCoach('first_name')}
                    error={coachErrors.first_name?.message}
                    placeholder="e.g., John"
                  />
                  <Input
                    label="Last Name"
                    {...registerCoach('last_name')}
                    error={coachErrors.last_name?.message}
                    placeholder="e.g., Smith"
                  />
                </div>
                <Input
                  label="School/Organization"
                  {...registerCoach('school')}
                  error={coachErrors.school?.message}
                  placeholder="e.g., University of Example"
                />
                <Input
                  label="Title"
                  {...registerCoach('title')}
                  error={coachErrors.title?.message}
                  placeholder="e.g., Head Coach, Assistant Coach"
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    What We Are Looking For
                  </label>
                  <textarea
                    {...registerCoach('what_we_are_looking_for')}
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Describe what you're looking for in athletes..."
                  />
                  {coachErrors.what_we_are_looking_for && (
                    <p className="text-red-500 text-sm mt-1">{coachErrors.what_we_are_looking_for.message}</p>
                  )}
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Camps I Will Be At
                    </label>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingCampIndex(null)
                        setShowCampModal(true)
                      }}
                    >
                      Add Camp
                    </Button>
                  </div>
                  {camps.length === 0 ? (
                    <p className="text-gray-500 text-sm">No camps added yet</p>
                  ) : (
                    <div className="space-y-2">
                      {camps.map((camp, index) => (
                        <div key={index} className="flex justify-between items-start p-3 bg-gray-50 rounded">
                          <div className="flex-1">
                            <p className="font-medium">{camp.name}</p>
                            {camp.location && <p className="text-sm text-gray-600">Location: {camp.location}</p>}
                            {camp.date && <p className="text-sm text-gray-600">Date: {camp.date}</p>}
                            {camp.url && (
                              <a href={camp.url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary-600">
                                {camp.url}
                              </a>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditCamp(index)}
                            >
                              Edit
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => handleRemoveCamp(index)}
                            >
                              Remove
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-4">
                  <Button type="submit">Save Changes</Button>
                  <Button type="button" variant="outline" onClick={() => setIsCoachEditMode(false)}>
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
                <div className="space-y-4">
                  {(profile.first_name || profile.last_name) && (
                    <div>
                      <p className="text-gray-600">Name</p>
                      <p className="font-medium">
                        {profile.first_name} {profile.last_name}
                      </p>
                    </div>
                  )}
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
              </CardContent>
            </Card>

            <Card className="mb-6">
              <CardHeader>
                <h2 className="text-xl font-semibold">What We Are Looking For</h2>
              </CardHeader>
              <CardContent>
                {profile.what_we_are_looking_for ? (
                  <p className="whitespace-pre-wrap">{profile.what_we_are_looking_for}</p>
                ) : (
                  <p className="text-gray-500">No information provided yet</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h2 className="text-xl font-semibold">Camps I Will Be At</h2>
              </CardHeader>
              <CardContent>
                {camps.length === 0 ? (
                  <p className="text-gray-500">No camps added yet</p>
                ) : (
                  <div className="space-y-4">
                    {camps.map((camp, index) => (
                      <Card key={index} variant="outlined">
                        <CardContent className="p-4">
                          <h3 className="font-semibold mb-2">{camp.name}</h3>
                          {camp.location && (
                            <p className="text-sm text-gray-600 mb-1">Location: {camp.location}</p>
                          )}
                          {camp.date && (
                            <p className="text-sm text-gray-600 mb-1">Date: {camp.date}</p>
                          )}
                          {camp.url && (
                            <a
                              href={camp.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-primary-600 hover:underline"
                            >
                              {camp.url}
                            </a>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        <CampModal
          isOpen={showCampModal}
          onClose={() => {
            setShowCampModal(false)
            setEditingCampIndex(null)
          }}
          onSave={handleAddCamp}
          camp={editingCampIndex !== null ? camps[editingCampIndex] : null}
        />
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

function CampModal({ 
  isOpen, 
  onClose, 
  onSave, 
  camp 
}: { 
  isOpen: boolean
  onClose: () => void
  onSave: (camp: any) => void
  camp: any | null
}) {
  const { register, handleSubmit, formState: { errors }, reset } = useForm<z.infer<typeof campSchema>>({
    resolver: zodResolver(campSchema),
    defaultValues: camp || {
      name: '',
      location: '',
      date: '',
      url: '',
    },
  })

  useEffect(() => {
    if (camp) {
      reset(camp)
    } else {
      reset({
        name: '',
        location: '',
        date: '',
        url: '',
      })
    }
  }, [camp, reset])

  const onSubmit = (data: z.infer<typeof campSchema>) => {
    onSave(data)
    reset()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={camp ? "Edit Camp" : "Add Camp"}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Camp Name"
          {...register('name')}
          error={errors.name?.message}
          placeholder="e.g., Summer Elite Camp"
        />
        <Input
          label="Location"
          {...register('location')}
          error={errors.location?.message}
          placeholder="e.g., University Campus, City, State"
        />
        <Input
          label="Date"
          {...register('date')}
          error={errors.date?.message}
          placeholder="e.g., June 15-17, 2024"
        />
        <Input
          label="Camp URL (Optional)"
          type="url"
          {...register('url')}
          error={errors.url?.message}
          placeholder="https://example.com/camp"
        />
        <div className="flex gap-4">
          <Button type="submit">{camp ? "Update" : "Add"} Camp</Button>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  )
}
