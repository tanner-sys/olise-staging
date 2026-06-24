export function formatChatError(message: string): string {
  const trimmed = message.trim()
  if (!trimmed.startsWith('{')) return message

  try {
    const parsed = JSON.parse(trimmed) as {
      error?: { type?: string; message?: string }
    }
    const err = parsed.error
    if (err?.type === 'overloaded_error') {
      return 'Claude is temporarily busy. Please wait a moment and try again.'
    }
    if (err?.type === 'rate_limit_error') {
      return 'Rate limit reached. Please wait a moment and try again.'
    }
    if (err?.message && err.message !== 'Overloaded') {
      return err.message
    }
  } catch {
    // not JSON
  }

  if (trimmed.includes('overloaded_error') || trimmed.includes('"Overloaded"')) {
    return 'Claude is temporarily busy. Please wait a moment and try again.'
  }

  if (trimmed.includes('Invalid or expired session') || trimmed.includes('Missing authorization token')) {
    return 'Your session expired. Please sign out and sign in again, then retry.'
  }

  return message
}
