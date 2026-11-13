import { Member } from './types';

export const TIERS: Record<number, { label: string; name: string }> = {
  5: { label: 'S', name: 'Xuất sắc' },
  4: { label: 'A', name: 'Khá' },
  3: { label: 'B', name: 'Trung bình' },
  2: { label: 'C', name: 'Đang lên' },
  1: { label: 'D', name: 'Mới chơi' },
};

const AVATAR_COLORS = ['#0ef', '#ffc533', '#ff6b6b', '#2ed3a0', '#4aa8ff', '#ff8a3d', '#ff7eb6', '#b6e93b'];

export function initials(name: string): string {
  const words = name.trim().split(/\s+/);
  const letters = words.length > 1 ? [words[0], words[words.length - 1]] : [words[0]];
  return letters.map((w) => w.charAt(0)).join('').toUpperCase();
}

export function avatarColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

export const formatMoney = (vnd: number) => `${vnd.toLocaleString('vi-VN')} đ`;

/** "YYYY-MM" for a date (local time). */
export function monthKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function monthLabel(key: string): string {
  const [y, m] = key.split('-');
  return `Tháng ${Number(m)}/${y}`;
}

export function formatMatchDate(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  const day = d.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
  const time = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  return `${time}, ${day}`;
}

export function slugify(name: string): string {
  const base = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 30);
  return base || 'member';
}

export function uniqueId(base: string, taken: Set<string>): string {
  let candidate = base.slice(0, 36);
  for (let i = 2; taken.has(candidate); i++) candidate = `${base.slice(0, 33)}-${i}`;
  return candidate;
}

export const randomId = () => Math.random().toString(36).slice(2, 10);

export const teamPower = (team: Member[]) => team.reduce((sum, m) => sum + m.tier, 0);

/**
 * Crops an image file to a centred square and shrinks it to a small JPEG
 * data URL, so profile photos stay a few KB no matter what the phone shoots.
 */
export function resizePhoto(file: File, size = 256, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Hãy chọn một file ảnh.'));
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const side = Math.min(img.naturalWidth, img.naturalHeight);
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error('Trình duyệt không xử lý được ảnh này.'));
        return;
      }
      ctx.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, size, size);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Không đọc được ảnh này. Thử ảnh JPG hoặc PNG khác.'));
    };
    img.src = url;
  });
}
