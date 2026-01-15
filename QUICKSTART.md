# Quick Start Guide

Get up and running in 5 minutes!

## 1. Install Dependencies

```bash
npm install
```

## 2. Set Up Supabase

1. Create account at [supabase.com](https://supabase.com)
2. Create a new project
3. Go to SQL Editor and run:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_rls_policies.sql`

## 3. Get Your Keys

In Supabase Dashboard → Settings → API:
- Copy `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
- Copy `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Copy `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`

## 4. Create `.env.local`

```env
NEXT_PUBLIC_SUPABASE_URL=your_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 5. Seed Demo Data (Optional)

```bash
npm run db:seed
```

Demo accounts:
- **Athletes**: `athlete1@demo.com` / `demo123456`
- **Coaches**: `coach1@demo.com` / `demo123456`

**Note**: Coaches are pre-verified in seed data. For new coaches, verify them in Supabase Dashboard → Table Editor → `coach_profiles` → set `verification_status` to `'verified'`.

## 6. Run the App

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## Next Steps

- Create an athlete account and complete your profile
- Create a coach account (verify it in the database)
- Search for athletes as a coach
- Try the discussions feature

## Troubleshooting

**"Failed to load profile"**
- Make sure migrations ran successfully
- Check RLS policies are enabled

**"Coach verification required"**
- Verify coach in database: `coach_profiles.verification_status = 'verified'`

**Build errors**
- Clear `.next` folder: `rm -rf .next`
- Reinstall: `rm -rf node_modules && npm install`
