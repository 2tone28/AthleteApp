/**
 * Get the default route for a user based on their role
 */
export function getDefaultRouteForUser(role: string | null): string {
  if (role === 'athlete') {
    return '/athlete-feed'
  } else if (role === 'coach') {
    return '/profile'
  }
  // Default fallback
  return '/profile'
}
