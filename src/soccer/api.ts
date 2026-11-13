import { SoccerState } from './types';

const ENDPOINT = '/api/soccer';

// Server error codes shown in Vietnamese (the API itself answers in English).
const MESSAGES: Record<string, string> = {
  wrong_pin: 'Sai mã PIN.',
  pin_locked: 'Nhập sai PIN quá nhiều lần. Thử lại sau 15 phút.',
  read_only: 'Trang này chưa bật chức năng chỉnh sửa.',
  fund_locked: 'Cần mở khóa quỹ bằng mã PIN để sửa phần quỹ.',
  rate_limited: 'Bạn thao tác quá nhanh. Đợi một chút rồi thử lại.',
  conflict: 'Có người vừa lưu trước bạn. Đã tải dữ liệu mới nhất, hãy thao tác lại.',
  invalid_request: 'Dữ liệu không hợp lệ.',
  payload_too_large: 'Dữ liệu quá lớn.',
  storage_error: 'Không kết nối được cơ sở dữ liệu. Thử lại sau.',
};

export class SoccerApiError extends Error {
  code: string;
  status: number;
  /** Latest server state, sent with 409 conflicts. */
  state?: SoccerState;

  constructor(status: number, code: string, message: string, state?: SoccerState) {
    super(message);
    this.status = status;
    this.code = code;
    this.state = state;
  }
}

async function request<T>(method: string, body?: unknown, pin?: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(ENDPOINT, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(pin ? { 'X-Admin-Pin': pin } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new SoccerApiError(0, 'network', 'Không kết nối được máy chủ. Kiểm tra mạng và thử lại.');
  }
  let data: any = null;
  try {
    data = await response.json();
  } catch {
    // non-JSON (platform error page)
  }
  if (!response.ok) {
    const err = data && data.error;
    const code = err?.code || 'unavailable';
    throw new SoccerApiError(response.status, code, MESSAGES[code] || 'Máy chủ đang gặp lỗi. Thử lại sau.', err?.state);
  }
  return data as T;
}

/** writable: anyone can edit members/teams/schedule. fundPin: fund edits are possible with the PIN. */
export const fetchState = () => request<{ state: SoccerState; writable: boolean; fundPin: boolean }>('GET');

export const verifyPin = (pin: string) => request<{ ok: true }>('POST', { action: 'verify' }, pin);

/** Uploads a resized photo; returns the URL to store in member.avatar. */
export async function uploadAvatar(memberId: string, photo: string): Promise<string> {
  let response: Response;
  try {
    response = await fetch('/api/soccer-avatar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ id: memberId, photo }),
    });
  } catch {
    throw new SoccerApiError(0, 'network', 'Không kết nối được máy chủ. Kiểm tra mạng và thử lại.');
  }
  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.avatar) {
    const code = data?.error?.code || 'unavailable';
    throw new SoccerApiError(response.status, code, MESSAGES[code] || 'Không tải ảnh lên được. Thử lại sau.');
  }
  return data.avatar as string;
}

/** The PIN is only checked by the server when the fund changed. */
export async function saveState(state: SoccerState, version: number, pin: string): Promise<SoccerState> {
  const { members, fund, matches } = state;
  const data = await request<{ state: SoccerState }>('PUT', { version, state: { members, fund, matches } }, pin);
  return data.state;
}
