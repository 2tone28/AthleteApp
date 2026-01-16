'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseClient } from '@/lib/supabase/client'
import { Nav } from '@/components/layout/Nav'
import { Card, CardContent } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { useForm } from 'react-hook-form'
import { useToast } from '@/lib/toast'

export default function SchoolsPage() {
  const router = useRouter()
  const supabase = createSupabaseClient()
  const { showToast } = useToast()
  const [schools, setSchools] = useState<any[]>([])
  const [interests, setInterests] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedSchool, setSelectedSchool] = useState<any>(null)
  const [showInterestModal, setShowInterestModal] = useState(false)

  useEffect(() => {
    loadSchools()
    loadInterests()
  }, [])

  const loadSchools = async () => {
    setIsLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/signin')
        return
      }

      let query = supabase.from('schools').select('*')

      if (search) {
        query = query.ilike('name', `%${search}%`)
      }

      const { data, error } = await query.order('name').limit(50)

      if (error) throw error
      setSchools(data || [])
    } catch (error: any) {
      showToast(error.message || 'Failed to load schools', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const loadInterests = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('athlete_school_interests')
        .select('school_id, interest_type')
        .eq('athlete_user_id', user.id)

      if (data) {
        setInterests(new Set(data.map(i => i.school_id)))
      }
    } catch (error) {
      // Silently fail
    }
  }

  const handleSearch = () => {
    loadSchools()
  }

  const toggleInterest = async (schoolId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      if (interests.has(schoolId)) {
        // Remove interest
        await supabase
          .from('athlete_school_interests')
          .delete()
          .eq('athlete_user_id', user.id)
          .eq('school_id', schoolId)
        setInterests(prev => {
          const next = new Set(prev)
          next.delete(schoolId)
          return next
        })
        showToast('Interest removed', 'success')
      } else {
        // Show modal to set interest type and visibility
        const school = schools.find(s => s.id === schoolId)
        setSelectedSchool(school)
        setShowInterestModal(true)
      }
    } catch (error: any) {
      showToast(error.message || 'Failed to update interest', 'error')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav />
      <div className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Browse Schools</h1>

        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex gap-4">
              <Input
                placeholder="Search schools..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="flex-1"
              />
              <Button onClick={handleSearch}>Search</Button>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="text-center py-12">Loading...</div>
        ) : schools.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-gray-500">No schools found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {schools.map((school) => (
              <Card key={school.id} variant="elevated" className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold mb-2">{school.name}</h3>
                    {school.division && (
                      <Badge variant="info" className="mb-2">
                        {school.division}
                      </Badge>
                    )}
                    {school.location && (
                      <p className="text-sm text-gray-600">{school.location}</p>
                    )}
                  </div>
                  <Button
                    variant={interests.has(school.id) ? 'secondary' : 'primary'}
                    size="sm"
                    onClick={() => toggleInterest(school.id)}
                    className="w-full"
                  >
                    {interests.has(school.id) ? '✓ Interested' : '+ Show Interest'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <InterestModal
          isOpen={showInterestModal}
          onClose={() => {
            setShowInterestModal(false)
            setSelectedSchool(null)
          }}
          school={selectedSchool}
          onSuccess={() => {
            loadInterests()
            setShowInterestModal(false)
            setSelectedSchool(null)
          }}
        />
      </div>
    </div>
  )
}

function InterestModal({
  isOpen,
  onClose,
  school,
  onSuccess,
}: {
  isOpen: boolean
  onClose: () => void
  school: any
  onSuccess: () => void
}) {
  const supabase = createSupabaseClient()
  const { showToast } = useToast()
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      interest_type: 'LIKE',
      visibility: 'PUBLIC_TO_VERIFIED_COACHES',
    },
  })

  const onSubmit = async (data: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !school) return

      const { error } = await supabase.from('athlete_school_interests').insert({
        athlete_user_id: user.id,
        school_id: school.id,
        interest_type: data.interest_type,
        visibility: data.visibility,
      })

      if (error) throw error

      showToast('Interest added!', 'success')
      onSuccess()
    } catch (error: any) {
      showToast(error.message || 'Failed to add interest', 'error')
    }
  }

  if (!school) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Show Interest in ${school.name}`}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Select
          label="Interest Level"
          options={[
            { value: 'LIKE', label: 'Like' },
            { value: 'FOLLOW', label: 'Follow' },
            { value: 'TOP_CHOICE', label: 'Top Choice' },
          ]}
          {...register('interest_type')}
          error={errors.interest_type?.message}
        />
        <Select
          label="Visibility"
          options={[
            { value: 'PUBLIC_TO_VERIFIED_COACHES', label: 'Show to all verified coaches' },
            { value: 'PRIVATE_UNTIL_APPROVED', label: 'Show only after I approve contact' },
            { value: 'PRIVATE', label: 'Keep private' },
          ]}
          {...register('visibility')}
          error={errors.visibility?.message}
        />
        <div className="flex gap-4">
          <Button type="submit">Add Interest</Button>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  )
}
