import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') })

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
    let userId: string | null = null

    // Try to create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: athlete.email,
      password: athlete.password,
      email_confirm: true,
    })

    if (authError) {
      // If user already exists, get the existing user
      if (authError.message?.includes('already been registered') || authError.code === 'email_exists') {
        console.log(`✓ Athlete ${athlete.email} already exists, ensuring user record...`)
        // Get existing user by email
        const { data: existingUsers } = await supabase.auth.admin.listUsers()
        const existingUser = existingUsers?.users.find(u => u.email === athlete.email)
        if (existingUser) {
          userId = existingUser.id
        } else {
          console.error(`Could not find existing user for ${athlete.email}`)
          continue
        }
      } else {
        console.error(`Error creating athlete ${athlete.email}:`, authError)
        continue
      }
    } else {
      userId = authData.user.id
    }

    if (!userId) {
      console.error(`No user ID for ${athlete.email}`)
      continue
    }

    // Ensure user record exists (upsert to handle existing records)
    const { error: userError } = await supabase.from('users').upsert({
      id: userId,
      role: athlete.role,
    }, {
      onConflict: 'id'
    })

    if (userError) {
      console.error(`Error creating user record for ${athlete.email}:`, userError)
      continue
    }

    const { error: profileError } = await supabase.from('athlete_profiles').upsert({
      user_id: userId,
      ...athlete.profile,
    }, {
      onConflict: 'user_id'
    })

    if (profileError) {
      console.error(`Error creating profile for ${athlete.email}:`, profileError)
      continue
    }

    // Add some highlights (only if they don't exist)
    const { data: existingHighlights } = await supabase
      .from('athlete_highlights')
      .select('id')
      .eq('athlete_user_id', userId)
      .limit(1)

    if (!existingHighlights || existingHighlights.length === 0) {
      await supabase.from('athlete_highlights').insert([
        {
          athlete_user_id: userId,
          title: 'Season Highlights',
          url: 'https://example.com/highlights',
        },
      ])
    }

    // Add some stats (only if they don't exist)
    const { data: existingStats } = await supabase
      .from('athlete_stats')
      .select('id')
      .eq('athlete_user_id', userId)
      .limit(1)

    if (!existingStats || existingStats.length === 0) {
      await supabase.from('athlete_stats').insert([
        {
          athlete_user_id: userId,
          season: '2023-2024',
          stat_key: 'Points per game',
          stat_value: '18.5',
          source_type: 'self_reported',
          verification_status: 'self_reported',
        },
      ])
    }

    console.log(`✓ Athlete ${athlete.email} ready`)
  }

  // Create coach users and profiles
  for (const coach of coaches) {
    let userId: string | null = null

    // Try to create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: coach.email,
      password: coach.password,
      email_confirm: true,
    })

    if (authError) {
      // If user already exists, get the existing user
      if (authError.message?.includes('already been registered') || authError.code === 'email_exists') {
        console.log(`✓ Coach ${coach.email} already exists, ensuring user record...`)
        // Get existing user by email
        const { data: existingUsers } = await supabase.auth.admin.listUsers()
        const existingUser = existingUsers?.users.find(u => u.email === coach.email)
        if (existingUser) {
          userId = existingUser.id
        } else {
          console.error(`Could not find existing user for ${coach.email}`)
          continue
        }
      } else {
        console.error(`Error creating coach ${coach.email}:`, authError)
        continue
      }
    } else {
      userId = authData.user.id
    }

    if (!userId) {
      console.error(`No user ID for ${coach.email}`)
      continue
    }

    // Ensure user record exists (upsert to handle existing records)
    const { error: userError } = await supabase.from('users').upsert({
      id: userId,
      role: coach.role,
    }, {
      onConflict: 'id'
    })

    if (userError) {
      console.error(`Error creating user record for ${coach.email}:`, userError)
      continue
    }

    const { error: profileError } = await supabase.from('coach_profiles').upsert({
      user_id: userId,
      ...coach.profile,
    }, {
      onConflict: 'user_id'
    })

    if (profileError) {
      console.error(`Error creating profile for ${coach.email}:`, profileError)
      continue
    }

    console.log(`✓ Coach ${coach.email} ready`)
  }

  // Seed schools
  console.log('\n📚 Seeding schools...')
  const schools = [
    { name: 'University of Alabama', division: 'NCAA D1', location: 'Tuscaloosa, AL' },
    { name: 'Auburn University', division: 'NCAA D1', location: 'Auburn, AL' },
    { name: 'University of Georgia', division: 'NCAA D1', location: 'Athens, GA' },
    { name: 'University of Florida', division: 'NCAA D1', location: 'Gainesville, FL' },
    { name: 'University of Texas', division: 'NCAA D1', location: 'Austin, TX' },
    { name: 'University of Southern California', division: 'NCAA D1', location: 'Los Angeles, CA' },
    { name: 'Stanford University', division: 'NCAA D1', location: 'Stanford, CA' },
    { name: 'University of Michigan', division: 'NCAA D1', location: 'Ann Arbor, MI' },
    { name: 'Ohio State University', division: 'NCAA D1', location: 'Columbus, OH' },
    { name: 'University of Notre Dame', division: 'NCAA D1', location: 'Notre Dame, IN' },
    { name: 'Clemson University', division: 'NCAA D1', location: 'Clemson, SC' },
    { name: 'University of Oklahoma', division: 'NCAA D1', location: 'Norman, OK' },
    { name: 'Penn State University', division: 'NCAA D1', location: 'University Park, PA' },
    { name: 'University of Oregon', division: 'NCAA D1', location: 'Eugene, OR' },
    { name: 'University of Washington', division: 'NCAA D1', location: 'Seattle, WA' },
    { name: 'Duke University', division: 'NCAA D1', location: 'Durham, NC' },
    { name: 'University of North Carolina', division: 'NCAA D1', location: 'Chapel Hill, NC' },
    { name: 'University of Kentucky', division: 'NCAA D1', location: 'Lexington, KY' },
    { name: 'University of Kansas', division: 'NCAA D1', location: 'Lawrence, KS' },
    { name: 'Villanova University', division: 'NCAA D1', location: 'Villanova, PA' },
  ]

  const schoolIds: Record<string, string> = {}

  for (const school of schools) {
    const { data, error } = await supabase
      .from('schools')
      .upsert(school, { onConflict: 'name' })
      .select('id')
      .single()

    if (error && !error.message?.includes('duplicate')) {
      console.error(`Error seeding school ${school.name}:`, error)
    } else if (data) {
      schoolIds[school.name] = data.id
      console.log(`✓ School: ${school.name}`)
    }
  }

  // Link coaches to schools
  console.log('\n🔗 Linking coaches to schools...')
  const coachSchoolMappings: Record<string, string> = {
    'coach1@demo.com': 'University of Alabama',
    'coach2@demo.com': 'Auburn University',
    'coach3@demo.com': 'University of Georgia',
  }

  for (const [email, schoolName] of Object.entries(coachSchoolMappings)) {
    const schoolId = schoolIds[schoolName]
    if (!schoolId) continue

    const { data: existingUsers } = await supabase.auth.admin.listUsers()
    const coachUser = existingUsers?.users.find(u => u.email === email)
    if (!coachUser) continue

    const { error } = await supabase
      .from('coach_profiles')
      .update({ school_id: schoolId })
      .eq('user_id', coachUser.id)

    if (error && !error.message?.includes('duplicate')) {
      console.error(`Error linking coach ${email} to school:`, error)
    } else {
      console.log(`✓ Linked ${email} to ${schoolName}`)
    }
  }

  // Seed some athlete school interests
  console.log('\n⭐ Seeding athlete school interests...')
  const athleteEmails = ['athlete1@demo.com', 'athlete2@demo.com', 'athlete3@demo.com']
  const interestSchools = ['University of Alabama', 'Auburn University', 'University of Georgia']

  for (let i = 0; i < athleteEmails.length; i++) {
    const email = athleteEmails[i]
    const schoolName = interestSchools[i]
    const schoolId = schoolIds[schoolName]
    if (!schoolId) continue

    const { data: existingUsers } = await supabase.auth.admin.listUsers()
    const athleteUser = existingUsers?.users.find(u => u.email === email)
    if (!athleteUser) continue

    const { error } = await supabase
      .from('athlete_school_interests')
      .upsert({
        athlete_user_id: athleteUser.id,
        school_id: schoolId,
        interest_type: 'LIKE',
        visibility: 'PUBLIC_TO_VERIFIED_COACHES',
      }, { onConflict: 'athlete_user_id,school_id' })

    if (error && !error.message?.includes('duplicate')) {
      console.error(`Error seeding interest for ${email}:`, error)
    } else {
      console.log(`✓ Interest: ${email} → ${schoolName}`)
    }
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

  console.log('✓ Seed completed successfully!')
}

seed().catch(console.error)
