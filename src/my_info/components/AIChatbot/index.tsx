import React, { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dataProfile from '../../mockData/dataProfile.json';
import type { ChatLang } from './i18n';
import '../../styles/chatbot.scss';

// The chat panel (and its styles) is code-split and only fetched when the
// visitor shows intent (hover/focus/touch) or opens the chat.
const loadChatWindow = () => import('./ChatWindow');
const ChatWindow = lazy(loadChatWindow);

const SEEN_KEY = 'portfolio-ai-chat:seen';

// Kept here (not in i18n.ts) so the eager bundle stays tiny.
const LAUNCHER_LABELS: Record<ChatLang, { open: string; close: string }> = {
  en: { open: `Chat with ${dataProfile.name}'s AI assistant`, close: 'Close chat' },
  vi: { open: `Trò chuyện với trợ lý AI của ${dataProfile.name}`, close: 'Đóng khung chat' },
};

const detectLang = (): ChatLang =>
  (navigator.languages || [navigator.language]).some((l) => /^vi\b/i.test(l || '')) ? 'vi' : 'en';

const readSeen = () => {
  try {
    return window.localStorage.getItem(SEEN_KEY) === '1';
  } catch {
    return false;
  }
};

const AIChatbot = () => {
  const lang = useMemo(detectLang, []);
  const t = LAUNCHER_LABELS[lang];
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [seen, setSeen] = useState(readSeen);
  const [footerOffset, setFooterOffset] = useState(0);
  const launcherRef = useRef<HTMLButtonElement>(null);

  // Lift the launcher above the footer (and its back-to-top button) when the footer is visible.
  useEffect(() => {
    const footer = document.querySelector('.footer');
    if (!footer || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(([entry]) => {
      setFooterOffset(entry.isIntersecting ? (footer as HTMLElement).offsetHeight : 0);
    });
    observer.observe(footer);
    return () => observer.disconnect();
  }, []);

  const prefetch = useCallback(() => {
    loadChatWindow();
  }, []);

  const toggle = () => {
    setMounted(true);
    setOpen((value) => !value);
    if (!seen) {
      setSeen(true);
      try {
        window.localStorage.setItem(SEEN_KEY, '1');
      } catch {
        // ignore
      }
    }
  };

  const close = useCallback(() => {
    setOpen(false);
    // Wait a frame: on phones the launcher is hidden until the panel closes.
    window.setTimeout(() => launcherRef.current?.focus({ preventScroll: true }), 0);
  }, []);

  return (
    <div
      className={`ai-chatbot${open ? ' is-open' : ''}`}
      style={{ '--chat-footer-offset': `${footerOffset}px` } as React.CSSProperties}
    >
      {mounted && (
        <Suspense fallback={null}>
          <ChatWindow open={open} lang={lang} onClose={close} />
        </Suspense>
      )}
      <button
        ref={launcherRef}
        type="button"
        className={`chat-launcher${seen ? '' : ' pulse'}`}
        onClick={toggle}
        onMouseEnter={prefetch}
        onFocus={prefetch}
        onTouchStart={prefetch}
        aria-label={open ? t.close : t.open}
        aria-expanded={open}
        aria-controls="ai-chat-window"
        title={open ? t.close : t.open}
      >
        <i className={`bx ${open ? 'bx-x' : 'bxs-bot'}`} aria-hidden="true"></i>
      </button>
    </div>
  );
};

export default AIChatbot;
