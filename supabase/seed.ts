import { createClient } from '@supabase/supabase-js'

// This script seeds the database with demo data
// Run with: tsx supabase/seed.ts

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function seed() {
  console.log('Starting seed...')

  // Create demo users (athletes and coaches)
  const athletes = [
    {
      email: 'athlete1@demo.com',
      password: 'demo123456',
      role: 'athlete' as const,
      profile: {
        first_name: 'Alex',
        last_name: 'Johnson',
        sport: 'Basketball',
        positions: ['PG', 'SG'],
        grad_year: 2025,
        city: 'Los Angeles',
        state: 'CA',
        bio: 'Passionate basketball player with 5 years of experience. Looking to play at the college level.',
        gpa: 3.8,
        sat_score: 1350,
        height_feet: 6,
        height_inches: 2,
        weight: 180,
        is_public: true,
        profile_completeness: 85,
      },
    },
    {
      email: 'athlete2@demo.com',
      password: 'demo123456',
      role: 'athlete' as const,
      profile: {
        first_name: 'Sarah',
        last_name: 'Williams',
        sport: 'Soccer',
        positions: ['M', 'F'],
        grad_year: 2026,
        city: 'Austin',
        state: 'TX',
        bio: 'Dedicated soccer player with strong technical skills and team leadership experience.',
        gpa: 3.9,
        height_feet: 5,
        height_inches: 6,
        weight: 130,
        is_public: true,
        profile_completeness: 90,
      },
    },
    {
      email: 'athlete3@demo.com',
      password: 'demo123456',
      role: 'athlete' as const,
      profile: {
        first_name: 'Michael',
        last_name: 'Davis',
        sport: 'Football',
        positions: ['QB', 'WR'],
        grad_year: 2025,
        city: 'Miami',
        state: 'FL',
        bio: 'Quarterback with strong arm and leadership qualities.',
        gpa: 3.6,
        height_feet: 6,
        height_inches: 1,
        weight: 195,
        is_public: true,
        profile_completeness: 80,
      },
    },
  ]

  const coaches = [
    {
      email: 'coach1@demo.com',
      password: 'demo123456',
      role: 'coach' as const,
      profile: {
        school: 'State University',
        title: 'Head Coach',
        sports: ['Basketball'],
        verification_status: 'verified' as const,
      },
    },
    {
      email: 'coach2@demo.com',
      password: 'demo123456',
      role: 'coach' as const,
      profile: {
        school: 'City College',
        title: 'Assistant Coach',
        sports: ['Soccer', 'Football'],
        verification_status: 'verified' as const,
      },
    },
  ]

  // Create athlete users and profiles
  for (const athlete of athletes) {
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: athlete.email,
      password: athlete.password,
      email_confirm: true,
    })

    if (authError) {
      console.error(`Error creating athlete ${athlete.email}:`, authError)
      continue
    }

    const { error: userError } = await supabase.from('users').insert({
      id: authData.user.id,
      role: athlete.role,
    })

    if (userError) {
      console.error(`Error creating user record for ${athlete.email}:`, userError)
      continue
    }

    const { error: profileError } = await supabase.from('athlete_profiles').insert({
      user_id: authData.user.id,
      ...athlete.profile,
    })

    if (profileError) {
      console.error(`Error creating profile for ${athlete.email}:`, profileError)
      continue
    }

    // Add some highlights
    await supabase.from('athlete_highlights').insert([
      {
        athlete_user_id: authData.user.id,
        title: 'Season Highlights',
        url: 'https://example.com/highlights',
      },
    ])

    // Add some stats
    await supabase.from('athlete_stats').insert([
      {
        athlete_user_id: authData.user.id,
        season: '2023-2024',
        stat_key: 'Points per game',
        stat_value: '18.5',
        source_type: 'self_reported',
        verification_status: 'self_reported',
      },
    ])

    console.log(`Created athlete: ${athlete.email}`)
  }

  // Create coach users and profiles
  for (const coach of coaches) {
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: coach.email,
      password: coach.password,
      email_confirm: true,
    })

    if (authError) {
      console.error(`Error creating coach ${coach.email}:`, authError)
      continue
    }

    const { error: userError } = await supabase.from('users').insert({
      id: authData.user.id,
      role: coach.role,
    })

    if (userError) {
      console.error(`Error creating user record for ${coach.email}:`, userError)
      continue
    }

    const { error: profileError } = await supabase.from('coach_profiles').insert({
      user_id: authData.user.id,
      ...coach.profile,
    })

    if (profileError) {
      console.error(`Error creating profile for ${coach.email}:`, profileError)
      continue
    }

    console.log(`Created coach: ${coach.email}`)
  }

  // Create some discussion threads
  const { data: athlete1 } = await supabase
    .from('users')
    .select('id')
    .eq('email', 'athlete1@demo.com')
    .single()

  if (athlete1) {
    await supabase.from('discussions_threads').insert([
      {
        created_by: athlete1.id,
        title: 'What should I include in my highlight reel?',
        is_hidden: false,
      },
      {
        created_by: athlete1.id,
        title: 'Tips for contacting college coaches',
        is_hidden: false,
      },
    ])

    console.log('Created discussion threads')
  }

  console.log('Seed completed!')
}

seed().catch(console.error)
