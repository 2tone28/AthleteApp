# AthleteConnect - MVP Web App

A platform connecting high school athletes with college coaches. Built with Next.js, TypeScript, Tailwind CSS, and Supabase.

## Features

### For Athletes
- Create and manage comprehensive profiles (academics, athletics, highlights)
- Add stats with source tracking (self-reported, source link, or upload)
- Control privacy settings (public vs coach-only fields)
- Receive contact requests from verified coaches
- Participate in community discussions

### For Coaches
- Search and filter athletes by sport, position, grad year, location, GPA, etc.
- View athlete profiles with coach-only fields (after verification)
- Save athletes to shortlist
- Send contact requests to athletes
- Participate in community discussions

### Safety & Privacy
- Row Level Security (RLS) policies protect sensitive data
- Coach verification required to view private athlete information
- Content reporting and moderation system
- Privacy-first design for minor athletes

## Tech Stack

- **Frontend**: Next.js 14 (App Router) + TypeScript
- **Styling**: Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **Forms**: React Hook Form + Zod validation
- **Hosting**: Vercel (frontend) + Supabase (backend)

## Prerequisites

- Node.js 18+ and npm/yarn
- A Supabase account (free tier works)
- Git

## Setup Instructions

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd "Athlete App"
npm install
```

### 2. Set Up Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for the project to be fully provisioned
3. Go to Project Settings > API to find:
   - Project URL
   - `anon` public key
   - `service_role` secret key (keep this secure!)

### 3. Run Database Migrations

1. In Supabase Dashboard, go to SQL Editor
2. Run the migration files in order:
   - Copy and paste contents of `supabase/migrations/001_initial_schema.sql`
   - Execute it
   - Copy and paste contents of `supabase/migrations/002_rls_policies.sql`
   - Execute it

Alternatively, if you have Supabase CLI installed:

```bash
supabase init
supabase link --project-ref your-project-ref
supabase db push
```

### 4. Configure Environment Variables

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 5. Seed Demo Data (Optional)

```bash
npm run db:seed
```

This creates demo athletes and coaches you can use for testing:
- Athletes: `athlete1@demo.com`, `athlete2@demo.com`, `athlete3@demo.com` (password: `demo123456`)
- Coaches: `coach1@demo.com`, `coach2@demo.com` (password: `demo123456`)

### 6. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── auth/              # Authentication pages
│   │   ├── onboarding/        # User onboarding flows
│   │   ├── profile/           # Profile management
│   │   ├── search/            # Athlete search (coaches)
│   │   ├── discussions/       # Community discussions
│   │   └── athlete/           # Public athlete profile views
│   ├── components/
│   │   ├── ui/                # Reusable UI components
│   │   └── layout/            # Layout components (Nav, etc.)
│   ├── lib/
│   │   ├── supabase/          # Supabase client setup
│   │   ├── validation.ts      # Zod schemas
│   │   ├── toast.tsx          # Toast notification system
│   │   └── stats-providers/   # Stats ingestion framework
│   └── types/
│       └── database.ts        # TypeScript types for database
├── supabase/
│   ├── migrations/            # Database migrations
│   └── seed.ts               # Seed data script
└── public/                    # Static assets
```

## Key Features Implementation

### Authentication
- Email/password authentication via Supabase Auth
- Role-based access (athlete, coach, admin)
- Protected routes and middleware

### Database Schema
- `users` - User accounts with roles
- `athlete_profiles` - Athlete information
- `coach_profiles` - Coach information with verification
- `athlete_highlights` - Highlight videos/links
- `athlete_stats` - Statistics with source tracking
- `saved_athletes` - Coach shortlists
- `contact_requests` - Coach-to-athlete contact requests
- `discussions_threads` & `discussions_posts` - Community discussions
- `reports` - Content moderation reports

### Row Level Security (RLS)
- Athletes can only edit their own profiles
- Public can only see public athlete fields
- Verified coaches can see coach-only fields
- Contact info is protected until approved
- Discussion moderation for admins

### Stats Provider Framework
Located in `src/lib/stats-providers/index.ts`, this framework provides:
- Extensible architecture for stats ingestion
- Safety guardrails (no ToS violations)
- Allowlist system for approved providers
- Support for manual entry, source links, and future API integrations

**Important**: Only add new providers after explicit permission and partnership agreements. The framework prevents unauthorized scraping.

## Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Add environment variables in Vercel dashboard:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_APP_URL` (your Vercel URL)
4. Deploy!

### Supabase Production Setup

1. Create a production Supabase project
2. Run migrations in production SQL Editor
3. Update environment variables in Vercel
4. Configure Supabase Auth redirect URLs in Supabase Dashboard:
   - Add your Vercel domain to allowed redirect URLs

## Testing

### Manual Testing Checklist

- [ ] Athlete signup and onboarding
- [ ] Coach signup and verification flow
- [ ] Athlete profile creation and editing
- [ ] Adding highlights and stats
- [ ] Coach search and filtering
- [ ] Viewing athlete profiles (public vs coach-only)
- [ ] Saving athletes to shortlist
- [ ] Sending contact requests
- [ ] Creating discussion threads and posts
- [ ] Reporting content
- [ ] RLS policies (test with different user roles)

### Admin Functions

To verify a coach manually:
1. Go to Supabase Dashboard > Table Editor > `coach_profiles`
2. Find the coach's record
3. Update `verification_status` to `'verified'`

To create an admin user:
1. Create a user via signup
2. In Supabase Dashboard > Table Editor > `users`
3. Update the user's `role` to `'admin'`

## Environment Variables Reference

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous/public key | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side only) | Yes |
| `NEXT_PUBLIC_APP_URL` | Your app URL (for redirects) | Yes |

## Next Steps / Future Enhancements

### Stats Ingestion
- [ ] Partner with official stat services (via API)
- [ ] Implement PDF/CSV parsers for user uploads
- [ ] Add verification workflow for stats
- [ ] Build admin tools for stat verification

### Features
- [ ] Email notifications for contact requests
- [ ] Advanced search filters (radius, multiple sports)
- [ ] Athlete dashboard with analytics
- [ ] Coach recruiting tools (notes, tags, pipeline)
- [ ] Mobile app (React Native)
- [ ] Video upload and processing
- [ ] Integration with recruiting services

### Safety & Moderation
- [ ] Automated content moderation
- [ ] Enhanced reporting system
- [ ] Background checks for coaches
- [ ] Parent/guardian consent flow for minors

### Performance
- [ ] Add caching layer (Redis)
- [ ] Implement search indexing (Algolia/Elasticsearch)
- [ ] Image optimization and CDN
- [ ] Database query optimization

## Troubleshooting

### "Failed to load profile"
- Check that RLS policies are correctly set up
- Verify user is authenticated
- Check browser console for specific errors

### "Coach verification required"
- Coaches must complete onboarding
- Admin must manually verify coach in database
- Check `coach_profiles.verification_status`

### Database connection issues
- Verify environment variables are set correctly
- Check Supabase project is active
- Ensure migrations have been run

### Build errors
- Run `npm install` to ensure dependencies are installed
- Check Node.js version (18+ required)
- Clear `.next` folder and rebuild

## Contributing

1. Follow the existing code structure
2. Maintain TypeScript types
3. Add RLS policies for new tables
4. Test with different user roles
5. Update documentation

## License

[Your License Here]

## Support

For issues or questions, please [open an issue](your-repo-url/issues) or contact [your-email].

---

**Built with ❤️ for athletes and coaches**
