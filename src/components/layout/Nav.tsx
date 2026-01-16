'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createSupabaseClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import clsx from 'clsx'

export function Nav() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createSupabaseClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const [userRole, setUserRole] = useState<string | null>(null)

  useEffect(() => {
    loadUserRole()
  }, [])

  const loadUserRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()

      setUserRole(data?.role || null)
    } catch (error) {
      // Silently fail
    }
  }

  const navItems = userRole === 'athlete' 
    ? [
        { href: '/athlete-feed', label: 'Home' },
        { href: '/schools', label: 'Schools' },
        { href: '/messages', label: 'Messages' },
        { href: '/profile', label: 'Profile' },
      ]
    : userRole === 'coach'
    ? [
        { href: '/profile', label: 'Home' },
        { href: '/search', label: 'Search' },
        { href: '/messages', label: 'Messages' },
        { href: '/profile', label: 'Profile' },
      ]
    : [
        // Landing page nav items for unauthenticated users
        { href: '/auth/signin', label: 'Sign In' },
        { href: '/auth/signup', label: 'Sign Up' },
      ]

  // For authenticated users, logo should go to their default route
  // For unauthenticated users, logo goes to landing page
  const logoHref = userRole ? (userRole === 'athlete' ? '/athlete-feed' : '/profile') : '/'

  return (
    <nav className="sticky top-0 z-40 bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-8">
            <Link href={logoHref} className="text-xl font-bold text-primary-600">
              AthleteConnect
            </Link>
            <div className="hidden md:flex gap-6">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={clsx(
                    'text-sm font-medium transition-colors',
                    pathname === item.href
                      ? 'text-primary-600 border-b-2 border-primary-600 pb-1'
                      : 'text-gray-600 hover:text-gray-900'
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
          {userRole ? (
            <button
              onClick={handleSignOut}
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              Sign Out
            </button>
          ) : null}
        </div>
      </div>
      {/* Mobile bottom nav - only show for authenticated users */}
      {userRole && navItems.length > 0 && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
          <div className="flex justify-around items-center h-16">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  'flex flex-col items-center justify-center flex-1 h-full transition-colors',
                  pathname === item.href ? 'text-primary-600' : 'text-gray-600'
                )}
              >
                <span className="text-xs font-medium">{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  )
}
