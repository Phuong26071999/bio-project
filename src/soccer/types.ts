export interface Member {
  id: string;
  name: string;
  /** Shirt number 0-99, null when not set. */
  number: number | null;
  /** 1 (D) to 5 (S). */
  tier: number;
  goals: number;
  /** https image URL or an uploaded photo (/api/soccer-avatar?...); initials when empty. */
  avatar: string;
}

export interface Expense {
  id: string;
  /** YYYY-MM-DD */
  date: string;
  note: string;
  amount: number;
}

export interface Fund {
  /** Monthly fee per member, in VND. */
  fee: number;
  /** "YYYY-MM" -> ids of members who paid that month. */
  payments: Record<string, string[]>;
  expenses: Expense[];
}

export interface Match {
  id: string;
  /** Local date-time string, e.g. 2026-11-20T19:30 */
  date: string;
  location: string;
  note: string;
  score: string;
  /** Member ids per team (empty until teams are saved). */
  teams: string[][];
}

export interface SoccerState {
  version: number;
  updatedAt: string | null;
  members: Member[];
  fund: Fund;
  matches: Match[];
}
