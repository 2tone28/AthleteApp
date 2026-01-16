'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { athleteProfileSchema } from '@/lib/validation'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { createSupabaseClient } from '@/lib/supabase/client'
import { useToast } from '@/lib/toast'
import type { z } from 'zod'

const SPORTS = [
  'Football', 'Basketball', 'Baseball', 'Soccer', 'Tennis', 'Track & Field',
  'Swimming', 'Volleyball', 'Softball', 'Golf', 'Wrestling', 'Lacrosse',
  'Cross Country', 'Other'
]

const POSITIONS: Record<string, string[]> = {
  'Football': ['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'DB', 'K', 'P'],
  'Basketball': ['PG', 'SG', 'SF', 'PF', 'C'],
  'Baseball': ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'],
  'Soccer': ['GK', 'D', 'M', 'F'],
  'Other': [],
}

const STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
]

export default function AthleteOnboardingPage() {
  const router = useRouter()
  const supabase = createSupabaseClient()
  const { showToast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [selectedSport, setSelectedSport] = useState('')

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<z.infer<typeof athleteProfileSchema>>({
    resolver: zodResolver(athleteProfileSchema),
  })

  const sport = watch('sport')
  const positions = watch('positions') || []

  const availablePositions = selectedSport && POSITIONS[selectedSport] ? POSITIONS[selectedSport] : []

  const onSubmit = async (data: z.infer<typeof athleteProfileSchema>) => {
    setIsLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Calculate profile completeness
      let completeness = 0
      const fields = ['first_name', 'last_name', 'sport', 'grad_year', 'city', 'state', 'gpa']
      fields.forEach(field => {
        if (data[field as keyof typeof data]) completeness += 14
      })
      if (data.positions && data.positions.length > 0) completeness += 14
      if (data.bio) completeness += 2

      // Check if profile already exists
      const { data: existingProfile } = await supabase
        .from('athlete_profiles')
        .select('user_id')
        .eq('user_id', user.id)
        .single()

      let error
      if (existingProfile) {
        // Update existing profile
        const { error: updateError } = await supabase
          .from('athlete_profiles')
          .update({
            ...data,
            profile_completeness: completeness,
          })
          .eq('user_id', user.id)
        error = updateError
      } else {
        // Insert new profile
        const { error: insertError } = await supabase.from('athlete_profiles').insert({
          user_id: user.id,
          ...data,
          profile_completeness: completeness,
        })
        error = insertError
      }

      if (error) throw error

      showToast('Profile created successfully!', 'success')
      router.push('/profile')
      router.refresh()
    } catch (error: any) {
      showToast(error.message || 'Failed to create profile', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <h1 className="text-2xl font-bold">Complete Your Athlete Profile</h1>
            <p className="text-gray-600 mt-2">Tell coaches about yourself</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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

              <Select
                label="Sport"
                options={SPORTS.map(s => ({ value: s, label: s }))}
                {...register('sport')}
                onChange={(e) => {
                  setSelectedSport(e.target.value)
                  setValue('sport', e.target.value)
                  setValue('positions', [])
                }}
                error={errors.sport?.message}
              />

              {availablePositions.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Positions
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {availablePositions.map(pos => (
                      <label key={pos} className="flex items-center">
                        <input
                          type="checkbox"
                          value={pos}
                          checked={positions.includes(pos)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setValue('positions', [...positions, pos])
                            } else {
                              setValue('positions', positions.filter(p => p !== pos))
                            }
                          }}
                          className="mr-2"
                        />
                        <span className="text-sm">{pos}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <Select
                label="Graduation Year"
                options={Array.from({ length: 6 }, (_, i) => {
                  const year = new Date().getFullYear() + i
                  return { value: year.toString(), label: year.toString() }
                })}
                {...register('grad_year', { valueAsNumber: true })}
                error={errors.grad_year?.message}
              />

              <div className="grid md:grid-cols-2 gap-4">
                <Input
                  label="City"
                  {...register('city')}
                  error={errors.city?.message}
                />
                <Select
                  label="State"
                  options={STATES.map(s => ({ value: s, label: s }))}
                  {...register('state')}
                  error={errors.state?.message}
                />
              </div>

              <Input
                label="GPA"
                type="number"
                step="0.01"
                min="0"
                max="4.0"
                {...register('gpa', { valueAsNumber: true })}
                error={errors.gpa?.message}
                helperText="On a 4.0 scale"
              />

              <div className="grid md:grid-cols-2 gap-4">
                <Input
                  label="Height (feet)"
                  type="number"
                  min="4"
                  max="7"
                  {...register('height_feet', { valueAsNumber: true })}
                  error={errors.height_feet?.message}
                />
                <Input
                  label="Height (inches)"
                  type="number"
                  min="0"
                  max="11"
                  {...register('height_inches', { valueAsNumber: true })}
                  error={errors.height_inches?.message}
                />
              </div>

              <Input
                label="Weight (lbs)"
                type="number"
                min="50"
                max="500"
                {...register('weight', { valueAsNumber: true })}
                error={errors.weight?.message}
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bio
                </label>
                <textarea
                  {...register('bio')}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Tell coaches about yourself..."
                />
                {errors.bio && <p className="mt-1 text-sm text-red-600">{errors.bio.message}</p>}
              </div>

              <Button type="submit" className="w-full" isLoading={isLoading}>
                Create Profile
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
