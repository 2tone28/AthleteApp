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
        { href: '/profile', label: 'Home', icon: '🏠', isHome: true },
        { href: '/schools/liked', label: 'Schools', icon: '🏛' },
        { href: '/schools', label: 'Search', icon: '🔍', isSearch: true },
        { href: '/messages', label: 'Messages', icon: '💬', isMessages: true },
      ]
    : userRole === 'coach'
    ? [
        { href: '/profile', label: 'Home', icon: '🏠', isHome: true },
        { href: '/athletes/interested', label: 'Athletes', icon: '⭐', isInterested: true },
        { href: '/search', label: 'Search', icon: '🔍', isSearch: true },
        { href: '/messages', label: 'Messages', icon: '💬', isMessages: true },
      ]
    : [
        // Landing page nav items for unauthenticated users
        { href: '/auth/signin', label: 'Sign In', icon: '🔑' },
        { href: '/auth/signup', label: 'Sign Up', icon: '✏' },
      ]

  // For authenticated users, logo should go to their default route
  // For unauthenticated users, logo goes to landing page
  const logoHref = userRole ? (userRole === 'athlete' ? '/profile' : '/profile') : '/'

  return (
    <nav className="sticky top-0 z-40 bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-8">
            <Link href={logoHref} className="text-2xl font-bold text-primary-600">
              AthleteConnect
            </Link>
            <div className="hidden md:flex gap-6">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={clsx(
                    'text-base font-medium transition-colors flex items-center gap-2',
                    pathname === item.href
                      ? 'text-primary-600 border-b-2 border-primary-600 pb-1'
                      : 'text-gray-600 hover:text-gray-900'
                  )}
                >
                  <span className={item.isHome || item.isMessages || item.isInterested ? 'text-2xl' : 'text-xl'}>{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
          {userRole ? (
            <button
              onClick={handleSignOut}
              className="text-base text-gray-600 hover:text-gray-900 transition-colors"
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
                <span className={item.isHome || item.isMessages || item.isInterested ? 'text-3xl mb-1' : 'text-2xl mb-1'}>{item.icon}</span>
                <span className="text-sm font-medium">{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  )
}
