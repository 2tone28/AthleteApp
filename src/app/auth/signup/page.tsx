'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { signUpSchema } from '@/lib/validation'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { createSupabaseClient } from '@/lib/supabase/client'
import { useToast } from '@/lib/toast'
import type { z } from 'zod'

export default function SignUpPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createSupabaseClient()
  const { showToast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [selectedRole, setSelectedRole] = useState<'athlete' | 'coach'>('athlete')

  useEffect(() => {
    const role = searchParams.get('role')
    if (role === 'athlete' || role === 'coach') {
      setSelectedRole(role)
    }
  }, [searchParams])

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<z.infer<typeof signUpSchema>>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      role: selectedRole,
    },
  })

  const role = watch('role')

  useEffect(() => {
    setValue('role', selectedRole)
  }, [selectedRole, setValue])

  const onSubmit = async (data: z.infer<typeof signUpSchema>) => {
    setIsLoading(true)
    try {
      // Sign up user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
      })

      if (authError) throw authError
      if (!authData.user) throw new Error('Failed to create user')

      // Create user record with role
      const { error: userError } = await supabase.from('users').insert({
        id: authData.user.id,
        role: data.role,
      })

      if (userError) throw userError

      showToast('Account created successfully!', 'success')
      
      // Redirect to onboarding
      if (data.role === 'athlete') {
        router.push('/onboarding/athlete')
      } else {
        router.push('/onboarding/coach')
      }
      router.refresh()
    } catch (error: any) {
      showToast(error.message || 'Failed to create account', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-4 mb-2">
            <Link href="/">
              <Button variant="ghost" size="sm">
                ← Back to Home
              </Button>
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-center">Create Account</h1>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Select
              label="I am a..."
              options={[
                { value: 'athlete', label: 'Athlete' },
                { value: 'coach', label: 'Coach' },
              ]}
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as 'athlete' | 'coach')}
            />
            <input type="hidden" {...register('role')} />
            <Input
              label="Email"
              type="email"
              {...register('email')}
              error={errors.email?.message}
            />
            <Input
              label="Password"
              type="password"
              {...register('password')}
              error={errors.password?.message}
              helperText="Must be at least 8 characters"
            />
            <Button type="submit" className="w-full" isLoading={isLoading}>
              Create Account
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            <span className="text-gray-600">Already have an account? </span>
            <Link href="/auth/signin" className="text-primary-600 hover:underline">
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
