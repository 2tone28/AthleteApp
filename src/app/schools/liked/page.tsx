'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseClient } from '@/lib/supabase/client'
import { Nav } from '@/components/layout/Nav'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/lib/toast'
import Link from 'next/link'

export default function LikedSchoolsPage() {
  const router = useRouter()
  const supabase = createSupabaseClient()
  const { showToast } = useToast()
  const [schoolInterests, setSchoolInterests] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedInterest, setSelectedInterest] = useState<any>(null)
  const [showEditModal, setShowEditModal] = useState(false)

  useEffect(() => {
    loadLikedSchools()
  }, [])

  const loadLikedSchools = async () => {
    setIsLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/signin')
        return
      }

      const { data, error } = await supabase
        .from('athlete_school_interests')
        .select(`
          *,
          schools (*)
        `)
        .eq('athlete_user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setSchoolInterests(data || [])
    } catch (error: any) {
      showToast(error.message || 'Failed to load liked schools', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemoveInterest = async (interestId: string) => {
    try {
      const { error } = await supabase
        .from('athlete_school_interests')
        .delete()
        .eq('id', interestId)

      if (error) throw error
      showToast('Interest removed', 'success')
      loadLikedSchools()
    } catch (error: any) {
      showToast(error.message || 'Failed to remove interest', 'error')
    }
  }

  const handleEditInterest = (interest: any) => {
    setSelectedInterest(interest)
    setShowEditModal(true)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav />
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">My Liked Schools</h1>
          <Link href="/schools">
            <Button variant="outline">Search Schools</Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="text-center py-12">Loading...</div>
        ) : schoolInterests.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-gray-500 mb-4">You haven't liked any schools yet</p>
              <Link href="/schools">
                <Button>Browse Schools</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {schoolInterests.map((interest) => (
              <Card key={interest.id} variant="elevated" className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold mb-2">{interest.schools?.name}</h3>
                    {interest.schools?.division && (
                      <Badge variant="info" className="mb-2">
                        {interest.schools.division}
                      </Badge>
                    )}
                    {interest.schools?.location && (
                      <p className="text-sm text-gray-600 mb-2">{interest.schools.location}</p>
                    )}
                    <div className="mt-2">
                      <Badge variant="success" className="text-xs mr-2">
                        {interest.interest_type === 'LIKE' ? 'Like' :
                         interest.interest_type === 'FOLLOW' ? 'Follow' :
                         interest.interest_type === 'TOP_CHOICE' ? 'Top Choice' :
                         interest.interest_type}
                      </Badge>
                      <p className="text-xs text-gray-500 mt-1">
                        {interest.visibility === 'PUBLIC_TO_VERIFIED_COACHES' ? 'Visible to coaches' :
                         interest.visibility === 'PRIVATE_UNTIL_APPROVED' ? 'Private until approved' :
                         'Private'}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditInterest(interest)}
                      className="flex-1"
                    >
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemoveInterest(interest.id)}
                      className="flex-1"
                    >
                      Remove
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <EditInterestModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false)
            setSelectedInterest(null)
          }}
          interest={selectedInterest}
          onSuccess={() => {
            loadLikedSchools()
            setShowEditModal(false)
            setSelectedInterest(null)
          }}
        />
      </div>
    </div>
  )
}

function EditInterestModal({
  isOpen,
  onClose,
  interest,
  onSuccess,
}: {
  isOpen: boolean
  onClose: () => void
  interest: any
  onSuccess: () => void
}) {
  const supabase = createSupabaseClient()
  const { showToast } = useToast()
  const [interestType, setInterestType] = useState(interest?.interest_type || 'LIKE')
  const [visibility, setVisibility] = useState(interest?.visibility || 'PUBLIC_TO_VERIFIED_COACHES')

  useEffect(() => {
    if (interest) {
      setInterestType(interest.interest_type)
      setVisibility(interest.visibility)
    }
  }, [interest])

  const handleSubmit = async () => {
    try {
      if (!interest) return

      const { error } = await supabase
        .from('athlete_school_interests')
        .update({
          interest_type: interestType,
          visibility: visibility,
        })
        .eq('id', interest.id)

      if (error) throw error
      showToast('Interest updated!', 'success')
      onSuccess()
    } catch (error: any) {
      showToast(error.message || 'Failed to update interest', 'error')
    }
  }

  if (!interest) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Edit Interest in ${interest.schools?.name}`}>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Interest Level
          </label>
          <select
            value={interestType}
            onChange={(e) => setInterestType(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="LIKE">Like</option>
            <option value="FOLLOW">Follow</option>
            <option value="TOP_CHOICE">Top Choice</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Visibility
          </label>
          <select
            value={visibility}
            onChange={(e) => setVisibility(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="PUBLIC_TO_VERIFIED_COACHES">Show to all verified coaches</option>
            <option value="PRIVATE_UNTIL_APPROVED">Show only after I approve contact</option>
            <option value="PRIVATE">Keep private</option>
          </select>
        </div>
        <div className="flex gap-4">
          <Button onClick={handleSubmit}>Update</Button>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  )
}
