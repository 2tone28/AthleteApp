'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { coachProfileSchema } from '@/lib/validation'
import { Input } from '@/components/ui/Input'
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

export default function CoachOnboardingPage() {
  const router = useRouter()
  const supabase = createSupabaseClient()
  const { showToast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [selectedSports, setSelectedSports] = useState<string[]>([])

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<z.infer<typeof coachProfileSchema>>({
    resolver: zodResolver(coachProfileSchema),
  })

  const handleSportToggle = (sport: string) => {
    const newSports = selectedSports.includes(sport)
      ? selectedSports.filter(s => s !== sport)
      : [...selectedSports, sport]
    setSelectedSports(newSports)
    setValue('sports', newSports)
  }

  const onSubmit = async (data: z.infer<typeof coachProfileSchema>) => {
    setIsLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Check if profile already exists
      const { data: existingProfile } = await supabase
        .from('coach_profiles')
        .select('user_id')
        .eq('user_id', user.id)
        .single()

      let error
      if (existingProfile) {
        // Update existing profile
        const { error: updateError } = await supabase
          .from('coach_profiles')
          .update({
            ...data,
            verification_status: 'pending',
          })
          .eq('user_id', user.id)
        error = updateError
      } else {
        // Insert new profile
        const { error: insertError } = await supabase.from('coach_profiles').insert({
          user_id: user.id,
          ...data,
          verification_status: 'pending',
        })
        error = insertError
      }

      if (error) throw error

      showToast('Profile created! Verification pending.', 'success')
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
            <h1 className="text-2xl font-bold">Complete Your Coach Profile</h1>
            <p className="text-gray-600 mt-2">We'll verify your credentials</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <Input
                label="School/Organization"
                {...register('school')}
                error={errors.school?.message}
                placeholder="e.g., University of Example"
              />

              <Input
                label="Title"
                {...register('title')}
                error={errors.title?.message}
                placeholder="e.g., Head Coach, Assistant Coach"
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sports You Recruit
                </label>
                <div className="flex flex-wrap gap-2">
                  {SPORTS.map(sport => (
                    <label key={sport} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedSports.includes(sport)}
                        onChange={() => handleSportToggle(sport)}
                        className="mr-2"
                      />
                      <span className="text-sm">{sport}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Verification:</strong> Your profile will be reviewed by our team. 
                  You'll receive an email once verification is complete. This usually takes 1-2 business days.
                </p>
              </div>

              <Button type="submit" className="w-full" isLoading={isLoading}>
                Submit for Verification
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
