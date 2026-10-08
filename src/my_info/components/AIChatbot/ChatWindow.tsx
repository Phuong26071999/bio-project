import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import MessageContent from './MessageContent';
import { ChatApiError, ChatApiMessage, ChatErrorCode, ChatRole, sendChat } from './chatApi';
import {
  ChatLang, SectionId, STRINGS, getFollowUpSuggestions, getSuggestions, getVisibleSection, looksVietnamese,
} from './i18n';
import '../../styles/chatWindow.scss';

interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  error?: ChatErrorCode;
  errorLang?: ChatLang;
}

interface Props {
  open: boolean;
  lang: ChatLang;
  onClose: () => void;
}

const STORAGE_KEY = 'portfolio-ai-chat:v1';
const MAX_STORED_MESSAGES = 30;
const MAX_SENT_MESSAGES = 12;
const MAX_INPUT_CHARS = 1000;
const MOBILE_QUERY = '(max-width: 480px)';
const FOLLOW_UP_DELAY_MS = 10000;
const MAX_INPUT_HEIGHT = 120;

const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
const isMobile = () => window.matchMedia(MOBILE_QUERY).matches;

function loadMessages(): ChatMessage[] {
  try {
    const parsed = JSON.parse(window.sessionStorage.getItem(STORAGE_KEY) || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content)
      .slice(-MAX_STORED_MESSAGES)
      .map((m) => ({ id: newId(), role: m.role, content: m.content }));
  } catch {
    return [];
  }
}

function saveMessages(messages: ChatMessage[]) {
  try {
    const stored = messages
      .filter((m) => !m.error)
      .slice(-MAX_STORED_MESSAGES)
      .map(({ role, content }) => ({ role, content }));
    if (stored.length) window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    else window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage may be unavailable (private mode, quota) — chat still works in memory.
  }
}

/** Recent, successful turns only, starting with a user message. */
function toApiHistory(messages: ChatMessage[]): ChatApiMessage[] {
  const history = messages
    .filter((m) => !m.error)
    .map(({ role, content }) => ({ role, content }))
    .slice(-MAX_SENT_MESSAGES);
  while (history.length && history[0].role !== 'user') history.shift();
  return history;
}

const ChatWindow = ({ open, lang, onClose }: Props) => {
  const t = STRINGS[lang];
  const [messages, setMessages] = useState<ChatMessage[]>(loadMessages);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [section, setSection] = useState<SectionId | null>(null);
  const [showFollowUps, setShowFollowUps] = useState(false);

  const messagesRef = useRef(messages);
  const abortRef = useRef<AbortController | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  messagesRef.current = messages;

  useEffect(() => saveMessages(messages), [messages]);

  // Abort any in-flight request when the widget unmounts.
  useEffect(() => () => abortRef.current?.abort(), []);

  useEffect(() => {
    if (!open) return;
    setSection(getVisibleSection());
    // Avoid popping the on-screen keyboard on touch devices.
    if (window.matchMedia('(pointer: fine)').matches) {
      window.setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 0);
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Mobile: full-screen panel that follows the visual viewport (on-screen keyboard)
  // and stops the page behind it from scrolling.
  useEffect(() => {
    if (!open || !isMobile()) return;
    const panel = panelRef.current;
    const vv = window.visualViewport;
    const update = () => {
      if (!panel || !vv) return;
      panel.style.setProperty('--chat-vv-height', `${vv.height}px`);
      panel.style.setProperty('--chat-vv-top', `${vv.offsetTop}px`);
    };
    // iOS can report the viewport mid keyboard animation; measure again once it settles.
    let settleTimer = 0;
    const updateAfterKeyboard = () => {
      window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(update, 350);
    };
    update();
    vv?.addEventListener('resize', update);
    vv?.addEventListener('scroll', update);
    panel?.addEventListener('focusin', updateAfterKeyboard);
    panel?.addEventListener('focusout', updateAfterKeyboard);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.clearTimeout(settleTimer);
      vv?.removeEventListener('resize', update);
      vv?.removeEventListener('scroll', update);
      panel?.removeEventListener('focusin', updateAfterKeyboard);
      panel?.removeEventListener('focusout', updateAfterKeyboard);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  // Offer more questions a while after a successful answer, while the panel is open.
  const lastMessage = messages[messages.length - 1];
  const answered = !loading && !!lastMessage && lastMessage.role === 'assistant' && !lastMessage.error;
  useEffect(() => {
    setShowFollowUps(false);
    if (!answered || !open) return;
    const timer = window.setTimeout(() => setShowFollowUps(true), FOLLOW_UP_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [answered, open, lastMessage]);

  useLayoutEffect(() => {
    const list = listRef.current;
    if (list && open) list.scrollTo({ top: list.scrollHeight, behavior: 'smooth' });
  }, [messages, loading, open, showFollowUps]);

  useLayoutEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    // scrollHeight is rounded down; the extra pixels stop a needless scrollbar
    // under browser zoom / fractional line heights.
    const needed = el.scrollHeight + 2;
    el.style.height = `${Math.min(needed, MAX_INPUT_HEIGHT)}px`;
    el.style.overflowY = needed > MAX_INPUT_HEIGHT ? 'auto' : 'hidden';
  }, [input]);

  const send = useCallback(async (text: string, { base, fromInput = false }: { base?: ChatMessage[]; fromInput?: boolean } = {}) => {
    const content = text.trim().slice(0, MAX_INPUT_CHARS);
    // abortRef doubles as the in-flight guard against duplicate submissions.
    if (!content || abortRef.current) return;

    const userMessage: ChatMessage = { id: newId(), role: 'user', content };
    const next = [...(base || messagesRef.current).filter((m) => !m.error), userMessage];
    const controller = new AbortController();
    abortRef.current = controller;
    messagesRef.current = next;
    setMessages(next);
    if (fromInput) setInput('');
    setLoading(true);

    try {
      const reply = await sendChat(toApiHistory(next), controller.signal);
      if (controller.signal.aborted) return;
      setMessages((prev) => [...prev, { id: newId(), role: 'assistant', content: reply }]);
    } catch (err) {
      if (controller.signal.aborted) return;
      const error = err instanceof ChatApiError ? err.code : 'unavailable';
      const errorLang: ChatLang = looksVietnamese(content) ? 'vi' : lang;
      setMessages((prev) => [...prev, { id: newId(), role: 'assistant', content: '', error, errorLang }]);
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
        setLoading(false);
      }
    }
  }, [lang]);

  const retry = useCallback(() => {
    const clean = messagesRef.current.filter((m) => !m.error);
    const last = clean[clean.length - 1];
    if (last && last.role === 'user') send(last.content, { base: clean.slice(0, -1) });
  }, [send]);

  const clearConversation = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setLoading(false);
    setMessages([]);
    setInput('');
    inputRef.current?.focus({ preventScroll: true });
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    send(input, { fromInput: true });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // isComposing: don't send while a Vietnamese/CJK IME is still composing a character.
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send(input, { fromInput: true });
    }
  };

  const handleSectionLink = useCallback(() => {
    if (isMobile()) onClose();
  }, [onClose]);

  const hasConversation = messages.some((m) => m.role === 'user');
  const canSend = input.trim().length > 0 && !loading;
  const showCounter = input.length > MAX_INPUT_CHARS * 0.8;

  const askedQuestions = messages.filter((m) => m.role === 'user').map((m) => m.content);
  const lastQuestion = askedQuestions[askedQuestions.length - 1];
  // Follow the language the visitor is actually typing in.
  const followUpLang: ChatLang = lastQuestion && looksVietnamese(lastQuestion) ? 'vi' : lang;
  const followUps = showFollowUps && answered ?getFollowUpSuggestions(followUpLang, section, askedQuestions) : [];

  return (
    <div
      ref={panelRef}
      id="ai-chat-window"
      className={`chat-window${open ? ' open' : ''}`}
      role="dialog"
      aria-modal="false"
      aria-labelledby="ai-chat-title"
      aria-hidden={!open}
    >
      <header className="chat-header">
        <span className="chat-avatar" aria-hidden="true">
          <i className="bx bxs-bot"></i>
        </span>
        <div className="chat-heading">
          <h3 id="ai-chat-title">{t.title}</h3>
          <p>
            <span className="chat-status-dot" aria-hidden="true"></span>
            {t.subtitle}
          </p>
        </div>
        <button
          type="button"
          className="chat-icon-btn"
          onClick={clearConversation}
          aria-label={t.clear}
          title={t.clear}
          disabled={!hasConversation && !loading}
        >
          <i className="bx bx-refresh"></i>
        </button>
        <button type="button" className="chat-icon-btn" onClick={onClose} aria-label={t.close} title={t.close}>
          <i className="bx bx-x"></i>
        </button>
      </header>

      <div className="chat-messages" ref={listRef} aria-live="polite" aria-relevant="additions">
        <div className="chat-msg assistant">
          <div className="chat-bubble">
            <p>{t.welcome}</p>
          </div>
        </div>

        {!hasConversation && (
          <div className="chat-suggestions">
            <span className="chat-suggestions-title">{t.suggestionsHeading}</span>
            <div className="chat-suggestion-list">
              {getSuggestions(lang, section).map((s) => (
                <button key={s.label} type="button" className="chat-suggestion" onClick={() => send(s.question)}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => (
          <div key={m.id} className={`chat-msg ${m.role}${m.error ? ' error' : ''}`}>
            <div className="chat-bubble">
              {m.error ? (
                <>
                  <p>
                    <i className="bx bx-error-circle" aria-hidden="true"></i> {STRINGS[m.errorLang || lang].errors[m.error]}
                  </p>
                  <button type="button" className="chat-retry" onClick={retry} disabled={loading}>
                    <i className="bx bx-revision" aria-hidden="true"></i> {STRINGS[m.errorLang || lang].retry}
                  </button>
                </>
              ) : m.role === 'assistant' ? (
                <MessageContent text={m.content} onSectionLink={handleSectionLink} />
              ) : (
                <p>{m.content}</p>
              )}
            </div>
          </div>
        ))}

        {followUps.length > 0 && (
          <div className="chat-suggestions">
            <span className="chat-suggestions-title">{STRINGS[followUpLang].followUpHeading}</span>
            <div className="chat-suggestion-list">
              {followUps.map((s) => (
                <button key={s.label} type="button" className="chat-suggestion" onClick={() => send(s.question)}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {loading && (
          <div className="chat-msg assistant">
            <div className="chat-bubble chat-typing" role="status" aria-label={t.typing}>
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}
      </div>

      <form className="chat-input" onSubmit={handleSubmit}>
        <div className="chat-input-row">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t.placeholder}
            aria-label={t.placeholder}
            rows={1}
            maxLength={MAX_INPUT_CHARS}
            {...({ enterKeyHint: 'send' } as Record<string, string>)}
          />
          <button type="submit" className="chat-send" disabled={!canSend} aria-label={t.send} title={t.send}>
            <i className="bx bxs-send"></i>
          </button>
        </div>
        <div className="chat-footnote">
          <span>{t.disclaimer}</span>
          {showCounter && (
            <span className="chat-counter">
              {input.length}/{MAX_INPUT_CHARS}
            </span>
          )}
        </div>
      </form>
    </div>
  );
};

export default ChatWindow;
