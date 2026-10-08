export type ChatRole = 'user' | 'assistant';

export interface ChatApiMessage {
  role: ChatRole;
  content: string;
}

export type ChatErrorCode =
  | 'rate_limited'
  | 'quota_exceeded'
  | 'timeout'
  | 'network'
  | 'message_too_long'
  | 'unavailable';

export class ChatApiError extends Error {
  code: ChatErrorCode;

  constructor(code: ChatErrorCode) {
    super(code);
    this.code = code;
  }
}

// Same-origin relative URL: works on localhost (via the dev proxy) and on any Vercel domain.
const ENDPOINT = '/api/chat';
const CLIENT_TIMEOUT_MS = 30000;

const KNOWN_CODES: ChatErrorCode[] = ['rate_limited', 'quota_exceeded', 'timeout', 'message_too_long'];

/**
 * Sends the recent conversation to the serverless endpoint and resolves with
 * the assistant's reply. Rejects with ChatApiError (or AbortError when the
 * caller aborts via `signal`).
 */
export async function sendChat(messages: ChatApiMessage[], signal: AbortSignal): Promise<string> {
  const controller = new AbortController();
  let timedOut = false;
  const timer = window.setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, CLIENT_TIMEOUT_MS);
  const onAbort = () => controller.abort();
  signal.addEventListener('abort', onAbort);

  try {
    let response: Response;
    try {
      response = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ messages }),
        signal: controller.signal,
      });
    } catch (err) {
      if (signal.aborted) throw err;
      throw new ChatApiError(timedOut ? 'timeout' : 'network');
    }

    let data: any = null;
    try {
      data = await response.json();
    } catch {
      // Non-JSON (e.g. platform error page) — handled below.
    }

    if (response.ok && data && typeof data.reply === 'string' && data.reply.trim()) {
      return data.reply;
    }
    const code = data && data.error && data.error.code;
    if (KNOWN_CODES.includes(code)) throw new ChatApiError(code);
    if (response.status === 429) throw new ChatApiError('rate_limited');
    if (response.status === 504) throw new ChatApiError('timeout');
    throw new ChatApiError('unavailable');
  } finally {
    window.clearTimeout(timer);
    signal.removeEventListener('abort', onAbort);
  }
}
