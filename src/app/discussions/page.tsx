'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseClient } from '@/lib/supabase/client'
import { Nav } from '@/components/layout/Nav'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { threadSchema, postSchema } from '@/lib/validation'
import { useToast } from '@/lib/toast'
import type { z } from 'zod'
import Link from 'next/link'

export default function DiscussionsPage() {
  const router = useRouter()
  const supabase = createSupabaseClient()
  const { showToast } = useToast()
  const [threads, setThreads] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedThread, setSelectedThread] = useState<any>(null)

  useEffect(() => {
    loadThreads()
  }, [])

  const loadThreads = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('discussions_threads')
        .select(`
          *,
          users:created_by (
            id,
            role
          )
        `)
        .eq('is_hidden', false)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error
      setThreads(data || [])
    } catch (error: any) {
      showToast(error.message || 'Failed to load discussions', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  if (selectedThread) {
    return (
      <ThreadDetailPage
        thread={selectedThread}
        onBack={() => setSelectedThread(null)}
      />
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Discussions</h1>
          <Button onClick={() => setShowCreateModal(true)}>New Thread</Button>
        </div>

        {isLoading ? (
          <div className="text-center py-12">Loading...</div>
        ) : threads.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-gray-500 mb-4">No discussions yet. Be the first to start one!</p>
              <Button onClick={() => setShowCreateModal(true)}>Create Thread</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {threads.map((thread) => (
              <Card
                key={thread.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelectedThread(thread)}
              >
                <CardContent className="p-6">
                  <h2 className="text-xl font-semibold mb-2">{thread.title}</h2>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span>
                      By User {thread.users?.id?.substring(0, 8)}
                    </span>
                    <span>•</span>
                    <span>{new Date(thread.created_at).toLocaleDateString()}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <CreateThreadModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={loadThreads}
        />
      </div>
    </div>
  )
}

function ThreadDetailPage({ thread, onBack }: { thread: any; onBack: () => void }) {
  const supabase = createSupabaseClient()
  const { showToast } = useToast()
  const [posts, setPosts] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showPostModal, setShowPostModal] = useState(false)

  useEffect(() => {
    loadPosts()
  }, [thread.id])

  const loadPosts = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('discussions_posts')
        .select(`
          *,
          users:created_by (
            id,
            role
          )
        `)
        .eq('thread_id', thread.id)
        .eq('is_hidden', false)
        .order('created_at', { ascending: true })

      if (error) throw error
      setPosts(data || [])
    } catch (error: any) {
      showToast(error.message || 'Failed to load posts', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleReport = async (targetType: 'post' | 'thread', targetId: string) => {
    const reason = prompt('Please provide a reason for reporting:')
    if (!reason) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase.from('reports').insert({
        reporter_id: user.id,
        target_type: targetType,
        target_id: targetId,
        reason,
        status: 'pending',
      })

      if (error) throw error
      showToast('Report submitted. Thank you for helping keep our community safe.', 'success')
    } catch (error: any) {
      showToast(error.message || 'Failed to submit report', 'error')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Button variant="ghost" onClick={onBack} className="mb-4">
          ← Back to Discussions
        </Button>

        <Card className="mb-6">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-bold mb-2">{thread.title}</h1>
                <p className="text-sm text-gray-600">
                  By User {thread.users?.id?.substring(0, 8)} •{' '}
                  {new Date(thread.created_at).toLocaleDateString()}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleReport('thread', thread.id)}
              >
                Report
              </Button>
            </div>
          </CardHeader>
        </Card>

        <div className="mb-6">
          <Button onClick={() => setShowPostModal(true)}>Reply</Button>
        </div>

        {isLoading ? (
          <div className="text-center py-12">Loading...</div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <Card key={post.id}>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-semibold">
                        User {post.users?.id?.substring(0, 8)}
                      </p>
                      <p className="text-sm text-gray-600">
                        {new Date(post.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleReport('post', post.id)}
                    >
                      Report
                    </Button>
                  </div>
                  <p className="text-gray-800 whitespace-pre-wrap">{post.body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <CreatePostModal
          isOpen={showPostModal}
          onClose={() => setShowPostModal(false)}
          threadId={thread.id}
          onSuccess={loadPosts}
        />
      </div>
    </div>
  )
}

function CreateThreadModal({
  isOpen,
  onClose,
  onSuccess,
}: {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}) {
  const supabase = createSupabaseClient()
  const { showToast } = useToast()
  const { register, handleSubmit, formState: { errors }, reset } = useForm<z.infer<typeof threadSchema>>({
    resolver: zodResolver(threadSchema),
  })

  const onSubmit = async (data: z.infer<typeof threadSchema>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase.from('discussions_threads').insert({
        created_by: user.id,
        title: data.title,
      })

      if (error) throw error

      showToast('Thread created!', 'success')
      reset()
      onClose()
      onSuccess()
    } catch (error: any) {
      showToast(error.message || 'Failed to create thread', 'error')
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Thread">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Title"
          {...register('title')}
          error={errors.title?.message}
          placeholder="What would you like to discuss?"
        />
        <div className="flex gap-4">
          <Button type="submit">Create</Button>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  )
}

function CreatePostModal({
  isOpen,
  onClose,
  threadId,
  onSuccess,
}: {
  isOpen: boolean
  onClose: () => void
  threadId: string
  onSuccess: () => void
}) {
  const supabase = createSupabaseClient()
  const { showToast } = useToast()
  const { register, handleSubmit, formState: { errors }, reset } = useForm<z.infer<typeof postSchema>>({
    resolver: zodResolver(postSchema),
  })

  const onSubmit = async (data: z.infer<typeof postSchema>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase.from('discussions_posts').insert({
        thread_id: threadId,
        created_by: user.id,
        body: data.body,
      })

      if (error) throw error

      showToast('Post created!', 'success')
      reset()
      onClose()
      onSuccess()
    } catch (error: any) {
      showToast(error.message || 'Failed to create post', 'error')
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Reply to Thread">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Your Reply
          </label>
          <textarea
            {...register('body')}
            rows={6}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="Share your thoughts..."
          />
          {errors.body && <p className="mt-1 text-sm text-red-600">{errors.body.message}</p>}
        </div>
        <div className="flex gap-4">
          <Button type="submit">Post</Button>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  )
}
