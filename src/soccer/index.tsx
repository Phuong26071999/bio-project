import React, { useCallback, useEffect, useRef, useState } from 'react';
import { SoccerApiError, fetchState, saveState, verifyPin } from './api';
import { Member, SoccerState } from './types';
import { monthKey } from './utils';
import MembersTab from './components/MembersTab';
import MemberDetail from './components/MemberDetail';
import TeamSplitTab from './components/TeamSplitTab';
import FundTab from './components/FundTab';
import ScheduleTab from './components/ScheduleTab';
import '@fontsource/barlow/400';
import '@fontsource/barlow/500';
import '@fontsource/barlow/600';
import '@fontsource/barlow-condensed/600';
import '@fontsource/barlow-condensed/700';
import '@fontsource/barlow-condensed/800';
import './soccer.scss';

type Tab = 'members' | 'split' | 'fund' | 'schedule';
const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'members', label: 'Thành viên', icon: 'bx-group' },
  { key: 'split', label: 'Chia đội', icon: 'bx-shuffle' },
  { key: 'fund', label: 'Quỹ', icon: 'bx-wallet' },
  { key: 'schedule', label: 'Lịch đá', icon: 'bx-calendar' },
];
const PIN_KEY = 'soccer-admin-pin';

const readPin = () => {
  try { return window.sessionStorage.getItem(PIN_KEY) || ''; } catch { return ''; }
};
const writePin = (pin: string) => {
  try {
    if (pin) window.sessionStorage.setItem(PIN_KEY, pin); else window.sessionStorage.removeItem(PIN_KEY);
  } catch { /* the PIN just won't survive a reload */ }
};

const SoccerPage = () => {
  const [data, setData] = useState<SoccerState | null>(null);
  const [loadError, setLoadError] = useState('');
  const [writable, setWritable] = useState(false);
  const [fundPin, setFundPin] = useState(false);
  const [pin, setPin] = useState(readPin);
  const [tab, setTab] = useState<Tab>('members');
  const [openId, setOpenId] = useState<string | null>(null);
  const [pinOpen, setPinOpen] = useState(false);
  const [toast, setToast] = useState<{ text: string; kind: 'ok' | 'error' } | null>(null);
  const [saving, setSaving] = useState(false);

  // Saves run one at a time; edits made while a save is in flight are sent right after it.
  const dataRef = useRef<SoccerState | null>(null);
  const versionRef = useRef(0);
  const savingRef = useRef(false);
  const dirtyRef = useRef(false);
  // Members, teams and schedule: anyone can edit. Fund: only after unlocking with the PIN.
  const canEdit = writable;
  const fundUnlocked = writable && fundPin && Boolean(pin);

  const notify = useCallback((text: string, kind: 'ok' | 'error' = 'ok') => {
    setToast({ text, kind });
    window.setTimeout(() => setToast((t) => (t && t.text === text ? null : t)), 3500);
  }, []);

  const applyServerState = (state: SoccerState) => {
    dataRef.current = state;
    versionRef.current = state.version;
    setData(state);
  };

  const load = useCallback(async () => {
    setLoadError('');
    try {
      const res = await fetchState();
      applyServerState(res.state);
      setWritable(res.writable);
      setFundPin(res.fundPin);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Không tải được dữ liệu.');
    }
  }, []);

  useEffect(() => {
    document.title = 'Đội bóng | Hoang Phuong';
    load();
  }, [load]);

  const flush = useCallback(async () => {
    if (savingRef.current) { dirtyRef.current = true; return; }
    savingRef.current = true;
    setSaving(true);
    try {
      do {
        dirtyRef.current = false;
        const saved = await saveState(dataRef.current!, versionRef.current, pin);
        versionRef.current = saved.version;
        if (!dirtyRef.current) applyServerState(saved);
      } while (dirtyRef.current);
    } catch (err) {
      if (err instanceof SoccerApiError && err.state) {
        applyServerState(err.state);
        notify(err.message, 'error');
      } else {
        if (err instanceof SoccerApiError && ['wrong_pin', 'pin_locked', 'fund_locked'].includes(err.code)) {
          setPin(''); writePin('');
        }
        notify(err instanceof Error ? `${err.message} Đang tải lại dữ liệu.` : 'Lưu thất bại.', 'error');
        load();
      }
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }, [pin, load, notify]);

  /** Applies a change locally right away, then saves it. */
  const update = useCallback((mutate: (draft: SoccerState) => SoccerState) => {
    if (!dataRef.current || !canEdit) return;
    const next = mutate(dataRef.current);
    dataRef.current = next;
    setData(next);
    flush();
  }, [canEdit, flush]);

  /** Same as update, for fund changes (the server also requires the PIN for these). */
  const updateFund = (mutate: (draft: SoccerState) => SoccerState) => {
    if (fundUnlocked) update(mutate);
  };

  const updateMember = (member: Member) =>
    update((s) => ({ ...s, members: s.members.map((m) => (m.id === member.id ? member : m)) }));

  const togglePaid = (memberId: string, month: string) => updateFund((s) => {
    const ids = s.fund.payments[month] || [];
    const nextIds = ids.includes(memberId) ? ids.filter((id) => id !== memberId) : [...ids, memberId];
    const payments = { ...s.fund.payments, [month]: nextIds };
    if (!nextIds.length) delete payments[month];
    return { ...s, fund: { ...s.fund, payments } };
  });

  const removeMember = (memberId: string) => {
    setOpenId(null);
    update((s) => ({
      ...s,
      members: s.members.filter((m) => m.id !== memberId),
      fund: {
        ...s.fund,
        payments: Object.fromEntries(Object.entries(s.fund.payments)
          .map(([k, ids]) => [k, ids.filter((id) => id !== memberId)] as [string, string[]])
          .filter(([, ids]) => ids.length)),
      },
      matches: s.matches.map((m) => ({ ...m, teams: m.teams.map((t) => t.filter((id) => id !== memberId)) })),
    }));
  };

  const lock = () => { setPin(''); writePin(''); notify('Đã khóa quỹ.'); };

  if (!data) {
    return (
      <div className="sc-page">
        <div className="sc-wrap sc-center">
          {loadError ? (
            <div className="sc-panel" role="alert">
              <h2>Không tải được dữ liệu đội bóng</h2>
              <p className="sc-muted">{loadError}</p>
              <button type="button" className="sc-btn" onClick={load}>Thử lại</button>
            </div>
          ) : (
            <div className="sc-skeleton" aria-label="Đang tải">
              <span></span><span></span><span></span><span></span>
            </div>
          )}
        </div>
      </div>
    );
  }

  const openMember = data.members.find((m) => m.id === openId) || null;
  const paidNow = (data.fund.payments[monthKey()] || []).length;
  const nextMatch = data.matches.filter((m) => new Date(m.date).getTime() >= Date.now()).sort((a, b) => a.date.localeCompare(b.date))[0];

  return (
    <div className="sc-page">
      <header className="sc-header">
        <div className="sc-wrap sc-header-row">
          <a className="sc-back" href="/" aria-label="Về trang portfolio"><i className="bx bx-arrow-back"></i></a>
          <div className="sc-title">
            <h1><i className="bx bx-football" aria-hidden="true"></i>Đội bóng</h1>
          </div>
          <dl className="sc-scoreboard">
            <div><dt>Cầu thủ</dt><dd>{data.members.length}</dd></div>
            <div><dt>Quỹ tháng</dt><dd>{paidNow}<small>/{data.members.length}</small></dd></div>
            <div><dt>Trận tới</dt><dd>{nextMatch ? new Date(nextMatch.date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }) : '--'}</dd></div>
          </dl>
          <div className="sc-admin">
            {saving && <span className="sc-saving" aria-live="polite"><i className="bx bx-loader-alt bx-spin" aria-hidden="true"></i> Đang lưu</span>}
            {!writable && <span className="sc-chip">Chế độ xem</span>}
          </div>
        </div>
        <nav className="sc-wrap sc-tabs" role="tablist" aria-label="Chức năng">
          {TABS.map((t) => (
            <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} className={tab === t.key ? 'on' : ''} onClick={() => setTab(t.key)}>
              <i className={`bx ${t.icon}`} aria-hidden="true"></i>{t.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="sc-wrap sc-main">
        {tab === 'members' && (
          <MembersTab state={data} isAdmin={canEdit} onOpen={(m) => setOpenId(m.id)}
            onAdd={(m) => update((s) => ({ ...s, members: [...s.members, m] }))} />
        )}
        {tab === 'split' && (
          <TeamSplitTab state={data} isAdmin={canEdit}
            onSaveToMatch={(matchId, teams) => {
              update((s) => ({ ...s, matches: s.matches.map((m) => (m.id === matchId ? { ...m, teams } : m)) }));
              notify('Đã lưu đội hình vào trận.');
            }} />
        )}
        {tab === 'fund' && (
          <FundTab state={data} isAdmin={fundUnlocked} onTogglePaid={togglePaid}
            lockState={!writable || !fundPin ? 'disabled' : fundUnlocked ? 'unlocked' : 'locked'}
            onUnlock={() => setPinOpen(true)} onLock={lock}
            onSetFee={(fee) => { updateFund((s) => ({ ...s, fund: { ...s.fund, fee } })); notify('Đã cập nhật tiền quỹ.'); }}
            onAddExpense={(e) => updateFund((s) => ({ ...s, fund: { ...s.fund, expenses: [...s.fund.expenses, e] } }))}
            onRemoveExpense={(id) => updateFund((s) => ({ ...s, fund: { ...s.fund, expenses: s.fund.expenses.filter((e) => e.id !== id) } }))} />
        )}
        {tab === 'schedule' && (
          <ScheduleTab state={data} isAdmin={canEdit}
            onAdd={(m) => { update((s) => ({ ...s, matches: [...s.matches, m] })); notify('Đã tạo trận.'); }}
            onUpdate={(match) => update((s) => ({ ...s, matches: s.matches.map((m) => (m.id === match.id ? match : m)) }))}
            onRemove={(id) => update((s) => ({ ...s, matches: s.matches.filter((m) => m.id !== id) }))} />
        )}
      </main>

      {openMember && (
        <MemberDetail member={openMember} state={data} isAdmin={canEdit} fundUnlocked={fundUnlocked} onChange={updateMember}
          onTogglePaid={togglePaid} onRemove={removeMember} onClose={() => setOpenId(null)} />
      )}

      {pinOpen && (
        <PinDialog onClose={() => setPinOpen(false)} onSuccess={(value) => {
          setPin(value); writePin(value); setPinOpen(false); notify('Đã mở khóa quỹ.');
        }} />
      )}

      {toast && <div className={`sc-toast ${toast.kind}`} role="status">{toast.text}</div>}
    </div>
  );
};

const PinDialog = ({ onClose, onSuccess }: { onClose: () => void; onSuccess: (pin: string) => void }) => {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim()) { setError('Nhập mã PIN.'); return; }
    setBusy(true);
    try {
      await verifyPin(value.trim());
      onSuccess(value.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không kiểm tra được mã PIN.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="sc-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="sc-dialog small" role="dialog" aria-modal="true" aria-labelledby="sc-pin-title" onSubmit={submit} noValidate>
        <button type="button" className="sc-close" onClick={onClose} aria-label="Đóng"><i className="bx bx-x"></i></button>
        <h2 id="sc-pin-title">Mở khóa quỹ</h2>
        <p className="sc-muted">Nhập mã PIN để đánh dấu đóng quỹ, đổi tiền quỹ và ghi khoản chi.</p>
        <label className="sc-field">
          <span>Mã PIN</span>
          <input type="password" inputMode="numeric" autoComplete="off" autoFocus value={value} aria-label="Mã PIN"
            onChange={(e) => { setValue(e.target.value); setError(''); }} />
        </label>
        {error && <small className="sc-error" role="alert">{error}</small>}
        <button type="submit" className="sc-btn" disabled={busy}>{busy ? 'Đang kiểm tra' : 'Mở khóa'}</button>
      </form>
    </div>
  );
};

export default SoccerPage;
