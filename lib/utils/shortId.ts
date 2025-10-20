import short from 'short-uuid'

// Create a short UUID translator
const translator = short()

/**
 * Generate a short ID from a UUID
 * @param uuid - The UUID to convert to short format
 * @returns Short ID string
 */
export function toShortId(uuid: string): string {
  return translator.fromUUID(uuid)
}

/**
 * Convert a short ID back to UUID
 * @param shortId - The short ID to convert back to UUID
 * @returns UUID string
 */
export function fromShortId(shortId: string): string {
  return translator.toUUID(shortId)
}

/**
 * Generate a new short ID (creates a new UUID and converts it to short format)
 * @returns Short ID string
 */
export function generateShortId(): string {
  return translator.new()
}

/**
 * Check if a string is a valid short ID format
 * @param id - The string to check
 * @returns boolean indicating if it's a valid short ID
 */
export function isValidShortId(id: string): boolean {
  try {
    translator.toUUID(id)
    return true
  } catch {
    return false
  }
}

/**
 * Check if a string is a valid UUID format
 * @param id - The string to check
 * @returns boolean indicating if it's a valid UUID
 */
export function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(id)
}

/**
 * Convert any ID (short or UUID) to short format
 * @param id - The ID to convert (can be short ID or UUID)
 * @returns Short ID string
 */
export function ensureShortId(id: string): string {
  if (isValidShortId(id)) {
    return id // Already a short ID
  } else if (isValidUUID(id)) {
    return toShortId(id) // Convert UUID to short ID
  } else {
    throw new Error(`Invalid ID format: ${id}`)
  }
}

/**
 * Convert any ID (short or UUID) to UUID format
 * @param id - The ID to convert (can be short ID or UUID)
 * @returns UUID string
 */
export function ensureUUID(id: string): string {
  if (isValidUUID(id)) {
    return id // Already a UUID
  } else if (isValidShortId(id)) {
    return fromShortId(id) // Convert short ID to UUID
  } else {
    throw new Error(`Invalid ID format: ${id}`)
  }
}

