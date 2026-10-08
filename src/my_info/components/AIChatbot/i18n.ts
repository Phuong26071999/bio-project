import dataProfile from '../../mockData/dataProfile.json';
import dataPortfolio from '../../mockData/dataPortfolio.json';
import type { ChatErrorCode } from './chatApi';

export type ChatLang = 'en' | 'vi';
export type SectionId = 'home' | 'about' | 'skills' | 'projects' | 'contact';

export interface Suggestion {
  label: string;
  question: string;
}

const name = dataProfile.name;
const featuredProject = dataPortfolio[0]?.title ?? 'POS System';

/** Rough check used to pick the language of client-side error messages. */
export const looksVietnamese = (text: string) =>
  /[ăâđêôơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i.test(text);

export const STRINGS = {
  en: {
    title: 'AI Assistant',
    subtitle: `Ask me anything about ${name}`,
    close: 'Close chat',
    clear: 'Start a new conversation',
    welcome: `Hi there! 👋 I'm ${name}'s AI assistant. Ask me about ${name}'s skills, experience, projects, or how to get in touch.`,
    suggestionsHeading: 'Try asking',
    followUpHeading: 'You might also ask',
    placeholder: 'Type your question…',
    send: 'Send message',
    typing: 'Assistant is typing',
    retry: 'Try again',
    disclaimer: 'AI answers are based on this portfolio and may be imperfect.',
    errors: {
      rate_limited: 'Too many requests. Please try again in a moment.',
      quota_exceeded: 'The assistant has reached its usage limit for now. Please try again later.',
      timeout: 'The assistant took too long to respond. Please try again.',
      network: 'Network error. Please check your connection and try again.',
      message_too_long: 'Your message is too long. Please shorten it and try again.',
      unavailable: 'Sorry, the AI assistant is temporarily unavailable. Please try again later.',
    } as Record<ChatErrorCode, string>,
  },
  vi: {
    title: 'Trợ lý AI',
    subtitle: `Hỏi mình bất cứ điều gì về ${name}`,
    close: 'Đóng khung chat',
    clear: 'Bắt đầu cuộc trò chuyện mới',
    welcome: `Xin chào! 👋 Mình là trợ lý AI của ${name}. Bạn có thể hỏi về kỹ năng, kinh nghiệm, dự án hoặc cách liên hệ với ${name}.`,
    suggestionsHeading: 'Gợi ý câu hỏi',
    followUpHeading: 'Bạn có thể hỏi tiếp',
    placeholder: 'Nhập câu hỏi của bạn…',
    send: 'Gửi tin nhắn',
    typing: 'Trợ lý đang trả lời',
    retry: 'Thử lại',
    disclaimer: 'Câu trả lời do AI tạo dựa trên portfolio này và có thể chưa hoàn hảo.',
    errors: {
      rate_limited: 'Bạn gửi quá nhiều yêu cầu. Vui lòng thử lại sau giây lát.',
      quota_exceeded: 'Trợ lý đã đạt giới hạn sử dụng. Vui lòng thử lại sau.',
      timeout: 'Trợ lý phản hồi quá lâu. Vui lòng thử lại.',
      network: 'Lỗi kết nối mạng. Vui lòng kiểm tra kết nối và thử lại.',
      message_too_long: 'Tin nhắn quá dài. Vui lòng rút gọn và thử lại.',
      unavailable: 'Xin lỗi, trợ lý AI tạm thời không khả dụng. Vui lòng thử lại sau.',
    } as Record<ChatErrorCode, string>,
  },
};

const BASE_SUGGESTIONS: Record<ChatLang, Suggestion[]> = {
  en: [
    { label: 'About Me', question: `Who is ${name}?` },
    { label: 'Skills', question: `What are ${name}'s technical skills?` },
    { label: 'Experience', question: `Can you summarize ${name}'s professional experience?` },
    { label: 'Projects', question: `What projects has ${name} worked on?` },
    { label: 'Contact', question: `How can I contact ${name}?` },
  ],
  vi: [
    { label: 'Giới thiệu', question: `${name} là ai?` },
    { label: 'Kỹ năng', question: `${name} có những kỹ năng kỹ thuật nào?` },
    { label: 'Kinh nghiệm', question: `Tóm tắt kinh nghiệm làm việc của ${name}.` },
    { label: 'Dự án', question: `${name} đã làm những dự án nào?` },
    { label: 'Liên hệ', question: `Làm sao để liên hệ với ${name}?` },
  ],
};

// One extra suggestion matching the section the visitor is currently viewing.
const SECTION_SUGGESTIONS: Record<ChatLang, Partial<Record<SectionId, Suggestion>>> = {
  en: {
    skills: { label: 'React & Next.js?', question: `Does ${name} have experience with ReactJS or Next.js?` },
    projects: { label: 'Project roles', question: `What was ${name}'s role in the ${featuredProject} project?` },
    about: { label: 'Years of experience', question: `How many years of professional experience does ${name} have?` },
    contact: { label: 'Why hire?', question: `Why should we hire ${name}?` },
  },
  vi: {
    skills: { label: 'React & Next.js?', question: `${name} có kinh nghiệm với ReactJS hoặc Next.js không?` },
    projects: { label: 'Vai trò dự án', question: `${name} đảm nhận vai trò gì trong dự án ${featuredProject}?` },
    about: { label: 'Số năm kinh nghiệm', question: `${name} có bao nhiêu năm kinh nghiệm làm việc?` },
    contact: { label: 'Vì sao tuyển?', question: `Vì sao nên tuyển ${name}?` },
  },
};

export function getSuggestions(lang: ChatLang, section: SectionId | null): Suggestion[] {
  const contextual = section ? SECTION_SUGGESTIONS[lang][section] : undefined;
  return contextual ? [contextual, ...BASE_SUGGESTIONS[lang]] : BASE_SUGGESTIONS[lang];
}

/** Suggestions the visitor hasn't asked yet, offered again after an answer. */
export function getFollowUpSuggestions(lang: ChatLang, section: SectionId | null, asked: string[]): Suggestion[] {
  const askedSet = new Set(asked.map((q) => q.trim().toLowerCase()));
  return getSuggestions(lang, section)
    .filter((s) => !askedSet.has(s.question.toLowerCase()))
    .slice(0, 4);
}

/** Finds the page section currently crossing the middle of the viewport. */
export function getVisibleSection(): SectionId | null {
  const middle = window.innerHeight / 2;
  const ids: SectionId[] = ['home', 'about', 'skills', 'projects', 'contact'];
  for (const id of ids) {
    const el = document.getElementById(id);
    if (!el) continue;
    const rect = el.getBoundingClientRect();
    if (rect.top <= middle && rect.bottom >= middle) return id;
  }
  return null;
}
