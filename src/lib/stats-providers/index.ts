/**
 * Stats Providers Framework
 * 
 * This module provides a framework for ingesting athlete statistics from various sources.
 * All providers must be explicitly allowlisted and permissioned.
 * 
 * IMPORTANT: This framework is designed to prevent ToS violations:
 * - No automated login/scraping
 * - No bypassing paywalls or rate limits
 * - All providers must be explicitly approved
 * - Only use official APIs or user-provided data
 */

export interface StatsProvider {
  name: string
  sourceType: 'api' | 'file_parser' | 'manual'
  isEnabled: boolean
  fetchStats: (params: StatsProviderParams) => Promise<StatsResult[]>
}

export interface StatsProviderParams {
  athleteUserId: string
  sourceUrl?: string
  fileData?: Buffer
  [key: string]: any
}

export interface StatsResult {
  season: string
  statKey: string
  statValue: string
  sourceType: 'self_reported' | 'source_link' | 'upload' | 'verified'
  sourceUrl?: string
  verificationStatus: 'self_reported' | 'source_provided' | 'verified'
}

/**
 * Allowlist of approved providers
 * Add providers here only after explicit permission and partnership agreement
 */
const ALLOWED_PROVIDERS: string[] = [
  // Example: 'official_team_api',
  // Example: 'partner_stat_service',
  // Add providers here only with explicit permission
]

/**
 * Provider registry
 * Register new providers here after they've been allowlisted
 */
const providers: Map<string, StatsProvider> = new Map()

/**
 * Register a new stats provider
 * Only call this for providers that have been explicitly allowlisted
 */
export function registerProvider(provider: StatsProvider): void {
  if (!ALLOWED_PROVIDERS.includes(provider.name)) {
    throw new Error(
      `Provider "${provider.name}" is not allowlisted. ` +
      `Add it to ALLOWED_PROVIDERS after obtaining explicit permission.`
    )
  }
  providers.set(provider.name, provider)
}

/**
 * Get a provider by name
 */
export function getProvider(name: string): StatsProvider | undefined {
  return providers.get(name)
}

/**
 * List all enabled providers
 */
export function listProviders(): StatsProvider[] {
  return Array.from(providers.values()).filter(p => p.isEnabled)
}

/**
 * Example: Manual entry provider (always available)
 * This is the default provider for user-entered stats
 */
export const manualProvider: StatsProvider = {
  name: 'manual',
  sourceType: 'manual',
  isEnabled: true,
  fetchStats: async (params: StatsProviderParams): Promise<StatsResult[]> => {
    // Manual entry doesn't fetch, it's entered by the user
    return []
  },
}

// Register the manual provider
registerProvider(manualProvider)

/**
 * TODO: Implement partner API providers
 * 
 * Example structure for a future partner API provider:
 * 
 * export const partnerApiProvider: StatsProvider = {
 *   name: 'partner_stat_service',
 *   sourceType: 'api',
 *   isEnabled: false, // Enable only after partnership agreement
 *   fetchStats: async (params: StatsProviderParams): Promise<StatsResult[]> => {
 *     // Implementation here
 *     // - Use official API with proper authentication
 *     // - Respect rate limits
 *     // - Handle errors gracefully
 *     // - Return structured stats
 *   },
 * }
 * 
 * To enable:
 * 1. Add 'partner_stat_service' to ALLOWED_PROVIDERS
 * 2. Set isEnabled: true
 * 3. Implement fetchStats with proper error handling
 * 4. Test thoroughly
 * 5. Document API credentials and usage
 */

/**
 * TODO: Implement file parser providers
 * 
 * Example structure for parsing user-uploaded files:
 * 
 * export const pdfParserProvider: StatsProvider = {
 *   name: 'pdf_box_score_parser',
 *   sourceType: 'file_parser',
 *   isEnabled: false, // Enable only after testing and approval
 *   fetchStats: async (params: StatsProviderParams): Promise<StatsResult[]> => {
 *     // Implementation here
 *     // - Parse PDF/CSV/Excel files
 *     // - Extract structured stats
 *     // - Validate data
 *     // - Return results
 *   },
 * }
 */

/**
 * Guardrails and safety checks
 */
export function validateProviderUsage(providerName: string): void {
  const provider = providers.get(providerName)
  
  if (!provider) {
    throw new Error(`Provider "${providerName}" not found`)
  }
  
  if (!provider.isEnabled) {
    throw new Error(`Provider "${providerName}" is not enabled`)
  }
  
  if (!ALLOWED_PROVIDERS.includes(providerName)) {
    throw new Error(`Provider "${providerName}" is not allowlisted`)
  }
}
