'use strict';

/**
 * AI provider wrapper. Gemini is the real provider; "mock" exists only so the
 * endpoint and UI can be tested locally without an API key. It is refused on
 * Vercel production deployments.
 */

const DEFAULT_MODEL = 'gemini-3.5-flash-lite';
const THINKING_LEVELS = ['MINIMAL', 'LOW', 'MEDIUM', 'HIGH'];

/** Errors with a stable `code` the handler maps to HTTP responses. */
class ProviderError extends Error {
  constructor(code, message, { status, cause } = {}) {
    super(message);
    this.name = 'ProviderError';
    this.code = code;
    this.status = status;
    if (cause) this.cause = cause;
  }
}

function getProviderConfig(env = process.env) {
  const provider = (env.CHAT_PROVIDER || 'gemini').toLowerCase();
  const isProduction = env.VERCEL_ENV === 'production';
  if (provider === 'mock') {
    return isProduction ? { error: 'Mock provider is disabled in production' } : { provider: 'mock' };
  }
  if (provider !== 'gemini') return { error: `Unknown CHAT_PROVIDER "${provider}"` };

  const apiKey = (env.GEMINI_API_KEY || '').trim();
  if (!apiKey) return { error: 'GEMINI_API_KEY is not set' };

  const thinkingLevel = (env.GEMINI_THINKING_LEVEL || '').trim().toUpperCase();
  return {
    provider: 'gemini',
    apiKey,
    model: (env.GEMINI_MODEL || '').trim() || DEFAULT_MODEL,
    thinkingLevel: THINKING_LEVELS.includes(thinkingLevel) ? thinkingLevel : undefined,
  };
}

let cachedClient = null;
let cachedKey = null;

function getGeminiClient(apiKey) {
  if (!cachedClient || cachedKey !== apiKey) {
    // Loaded lazily so the mock provider and tests don't need the SDK.
    const { GoogleGenAI } = require('@google/genai');
    cachedClient = new GoogleGenAI({ apiKey });
    cachedKey = apiKey;
  }
  return cachedClient;
}

/** Maps SDK / network failures to stable error codes. */
function classifyGeminiError(err, signal) {
  if ((signal && signal.aborted) || (err && (err.name === 'AbortError' || err.name === 'TimeoutError'))) {
    return new ProviderError('timeout', 'Gemini request timed out', { cause: err });
  }
  const status = Number(err && err.status);
  if (status === 429) return new ProviderError('quota', 'Gemini rate limit or quota exceeded', { status, cause: err });
  if (status === 400 || status === 401 || status === 403 || status === 404) {
    return new ProviderError('config', `Gemini rejected the request configuration (${status})`, { status, cause: err });
  }
  return new ProviderError('unavailable', `Gemini request failed${status ? ` (${status})` : ''}`, { status, cause: err });
}

async function generateWithGemini(config, { systemInstruction, history, signal }) {
  const ai = getGeminiClient(config.apiKey);
  const contents = history.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  let response;
  try {
    response = await ai.models.generateContent({
      model: config.model,
      contents,
      config: {
        systemInstruction,
        temperature: 0.4,
        maxOutputTokens: 1024,
        abortSignal: signal,
        ...(config.thinkingLevel ? { thinkingConfig: { thinkingLevel: config.thinkingLevel } } : {}),
      },
    });
  } catch (err) {
    throw classifyGeminiError(err, signal);
  }

  const text = (response && response.text ? response.text : '').trim();
  if (!text) {
    const reason = (response && response.promptFeedback && response.promptFeedback.blockReason)
      || (response && response.candidates && response.candidates[0] && response.candidates[0].finishReason)
      || 'empty';
    throw new ProviderError('empty', `Gemini returned no text (${reason})`);
  }
  return text;
}

async function generateWithMock({ history, signal }, env = process.env) {
  const failure = env.MOCK_FAIL;
  const delay = Number.parseInt(env.MOCK_DELAY_MS || '600', 10);
  await new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, delay);
    if (signal) {
      signal.addEventListener('abort', () => {
        clearTimeout(timer);
        reject(new ProviderError('timeout', 'Mock request timed out'));
      }, { once: true });
    }
  });
  if (failure === '429') throw new ProviderError('quota', 'Mock quota exceeded', { status: 429 });
  if (failure === '500') throw new ProviderError('unavailable', 'Mock provider failure', { status: 500 });
  if (failure === 'config') throw new ProviderError('config', 'Mock config failure', { status: 400 });

  const { profile } = require('./knowledge');
  const last = history[history.length - 1].content;
  const vietnamese = /[ăâđêôơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i.test(last);
  const email = profile.contactItems.find((c) => c.label === 'Email');
  return vietnamese
    ? `**[Mock]** Bạn vừa hỏi: "${last}".\n\nĐây là phản hồi thử nghiệm. ${profile.fullName} là ${profile.title}.\n- Email: ${email.value}\n- Xem thêm tại [Dự án](#projects)`
    : `**[Mock]** You asked: "${last}".\n\nThis is a test response. ${profile.fullName} is a ${profile.title}.\n- Email: ${email.value}\n- See more in [Projects](#projects)`;
}

async function generateReply(config, request) {
  if (config.provider === 'mock') return generateWithMock(request);
  return generateWithGemini(config, request);
}

module.exports = { DEFAULT_MODEL, ProviderError, getProviderConfig, generateReply, classifyGeminiError };
