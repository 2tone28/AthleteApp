import { z } from 'zod'

// Auth schemas
export const signUpSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['athlete', 'coach']),
})

export const signInSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

// Athlete profile schemas
export const athleteProfileSchema = z.object({
  first_name: z.string().min(1, 'First name is required').optional().or(z.literal('')),
  last_name: z.string().min(1, 'Last name is required').optional().or(z.literal('')),
  sport: z.string().optional(),
  positions: z.array(z.string()).optional(),
  grad_year: z.number().int().min(2020).max(2030).optional().or(z.null()),
  city: z.string().optional(),
  state: z.string().optional(),
  bio: z.string().max(1000, 'Bio must be less than 1000 characters').optional(),
  gpa: z.number().min(0).max(4.0).optional().or(z.null()),
  sat_score: z.number().int().min(400).max(1600).optional().or(z.null()),
  act_score: z.number().int().min(1).max(36).optional().or(z.null()),
  height_feet: z.number().int().min(4).max(7).optional().or(z.null()),
  height_inches: z.number().int().min(0).max(11).optional().or(z.null()),
  weight: z.number().int().min(50).max(500).optional().or(z.null()),
  is_public: z.boolean().optional(),
})

// Coach profile schemas
export const coachProfileSchema = z.object({
  school: z.string().min(1, 'School is required'),
  title: z.string().min(1, 'Title is required'),
  sports: z.array(z.string()).optional(),
})

// Highlight schemas
export const highlightSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  url: z.string().url('Invalid URL'),
})

// Stat schemas
export const statSchema = z.object({
  season: z.string().min(1, 'Season is required'),
  stat_key: z.string().min(1, 'Stat key is required'),
  stat_value: z.string().min(1, 'Stat value is required'),
  source_type: z.enum(['self_reported', 'source_link', 'upload']),
  source_url: z.string().url().optional().or(z.literal('')),
})

// Contact request schemas
export const contactRequestSchema = z.object({
  message: z.string().max(500, 'Message must be less than 500 characters').optional(),
})

// Discussion schemas
export const threadSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
})

export const postSchema = z.object({
  body: z.string().min(1, 'Post body is required').max(5000, 'Post must be less than 5000 characters'),
})

// Report schemas
export const reportSchema = z.object({
  reason: z.string().min(1, 'Reason is required').max(500, 'Reason must be less than 500 characters'),
})
