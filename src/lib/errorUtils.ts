import { FunctionsHttpError } from "@supabase/supabase-js";

/**
 * Extracts the real error message from a Supabase Edge Function error.
 *
 * When `supabase.functions.invoke()` gets a non-2xx response, it wraps
 * it in a `FunctionsHttpError` with a generic message. The actual error
 * message from the edge function's JSON response body is buried inside
 * `error.context`. This helper digs it out.
 */
export async function getEdgeFunctionError(error: unknown, fallback: string): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = await error.context.json();
      if (body?.error && typeof body.error === "string") {
        return body.error;
      }
    } catch {
      // context.json() failed — fall through
    }
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallback;
}

/**
 * Maps database and application errors to user-friendly messages
 * while logging the full error details for debugging
 */
export function getSafeErrorMessage(error: any, isStudent: boolean = false): string {
  // Log full error for debugging (only visible in console, not to users)
  console.error('Full error details:', error);
  
  // Handle Supabase/Postgres error codes
  if (error.code) {
    // Unique constraint violation
    if (error.code === '23505') {
      return isStudent ? 'This username is already taken. Please try another.' : 'This record already exists. Please try a different value.';
    }
    
    // Foreign key violation
    if (error.code === '23503') {
      return 'The referenced record does not exist.';
    }
    
    // Permission denied / RLS policy violation
    if (error.code === '42501' || error.code === 'PGRST301') {
      return 'You do not have permission to perform this action.';
    }
    
    // Not null violation
    if (error.code === '23502') {
      return 'Required information is missing. Please fill in all required fields.';
    }
  }
  
  // Handle Supabase auth errors
  if (error.message) {
    const msg = error.message.toLowerCase();
    
    // Auth-specific errors
    if (msg.includes('invalid login credentials') || msg.includes('invalid email or password')) {
      return isStudent ? 'Invalid username or password. Please try again.' : 'Invalid email or password. Please try again.';
    }
    
    if (msg.includes('email not confirmed') || msg.includes('email not verified')) {
      return 'Please verify your email address before logging in.';
    }
    
    if (msg.includes('user already registered') || msg.includes('user already exists')) {
      return isStudent ? 'An account with this username already exists.' : 'An account with this email already exists.';
    }
    
    if (msg.includes('rls') || msg.includes('row level security')) {
      return 'Access denied. Please contact support if this persists.';
    }
    
    if (msg.includes('network') || msg.includes('fetch')) {
      return 'Network error. Please check your connection and try again.';
    }
    
    if (msg.includes('timeout')) {
      return 'Request timed out. Please try again.';
    }
  }
  
  // Generic fallback message
  return 'An unexpected error occurred. Please try again or contact support if the problem persists.';
}
