import React, { useEffect, useRef, useState } from 'react';
import { Member, Role, SoccerState } from '../types';
import { ROLE_LABEL, TIERS, formatMoney, monthKey, monthLabel } from '../utils';
import Avatar from './Avatar';

interface Props {
  member: Member;
  state: SoccerState;
  /** Can edit profile, tier and goals (open to everyone). */
  isAdmin: boolean;
  /** Can change fund payments (needs the PIN). */
  fundUnlocked: boolean;
  onChange: (member: Member) => void;
  onTogglePaid: (memberId: string, month: string) => void;
  onRemove: (memberId: string) => void;
  onClose: () => void;
}

const MemberDetail = ({ member, state, isAdmin, fundUnlocked, onChange, onTogglePaid, onRemove, onClose }: Props) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [name, setName] = useState(member.name);
  const [avatar, setAvatar] = useState(member.avatar);
  const [avatarError, setAvatarError] = useState('');
  const thisMonth = monthKey();
  const paidThisMonth = (state.fund.payments[thisMonth] || []).includes(member.id);
  const paidMonths = Object.keys(state.fund.payments).filter((m) => state.fund.payments[m].includes(member.id)).sort().reverse();
  const matchesPlayed = state.matches.filter((m) => m.teams.some((t) => t.includes(member.id))).length;

  useEffect(() => {
    setName(member.name);
    setAvatar(member.avatar);
  }, [member]);

  useEffect(() => {
    dialogRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const saveName = () => {
    const trimmed = name.trim();
    if (trimmed && trimmed !== member.name) onChange({ ...member, name: trimmed.slice(0, 60) });
    else setName(member.name);
  };

  const saveAvatar = () => {
    const url = avatar.trim();
    if (url && !/^https:\/\//i.test(url)) {
      setAvatarError('Link ảnh phải bắt đầu bằng https://');
      return;
    }
    setAvatarError('');
    if (url !== member.avatar) onChange({ ...member, avatar: url });
  };

  return (
    <div className="sc-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sc-dialog" role="dialog" aria-modal="true" aria-labelledby="sc-detail-name" tabIndex={-1} ref={dialogRef}>
        <button type="button" className="sc-close" onClick={onClose} aria-label="Đóng"><i className="bx bx-x"></i></button>

        <div className="sc-detail-head">
          <Avatar member={member} size={88} />
          <div>
            {isAdmin ? (
              <input id="sc-detail-name" className="sc-name-input" value={name} maxLength={60}
                onChange={(e) => setName(e.target.value)} onBlur={saveName}
                onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()} aria-label="Tên thành viên" />
            ) : (
              <h2 id="sc-detail-name">{member.name}</h2>
            )}
            <span className={`sc-role ${member.role}`}>{ROLE_LABEL[member.role]}</span>
          </div>
        </div>

        <div className="sc-detail-grid">
          <div className="sc-stat">
            <small>Tier (năng lực)</small>
            <b className={`sc-tier big t${member.tier}`}>{TIERS[member.tier].label}</b>
            <span>{TIERS[member.tier].name}</span>
          </div>
          <div className="sc-stat">
            <small>Bàn thắng</small>
            <b>{member.goals}</b>
            {isAdmin && (
              <span className="sc-stepper">
                <button type="button" onClick={() => onChange({ ...member, goals: Math.max(0, member.goals - 1) })} aria-label="Bớt 1 bàn" disabled={member.goals === 0}>-</button>
                <button type="button" onClick={() => onChange({ ...member, goals: member.goals + 1 })} aria-label="Thêm 1 bàn">+</button>
              </span>
            )}
          </div>
          <div className="sc-stat">
            <small>Quỹ {monthLabel(thisMonth).toLowerCase()}</small>
            <b className={paidThisMonth ? 'ok' : 'warn'}>{paidThisMonth ? 'Đã đóng' : 'Chưa đóng'}</b>
            <span>{formatMoney(state.fund.fee)}</span>
          </div>
          <div className="sc-stat">
            <small>Số trận đã xếp đội</small>
            <b>{matchesPlayed}</b>
          </div>
        </div>

        {isAdmin && (
          <div className="sc-admin-fields">
            <label>
              <span>Tier</span>
              <select value={member.tier} onChange={(e) => onChange({ ...member, tier: Number(e.target.value) })}>
                {[5, 4, 3, 2, 1].map((t) => <option key={t} value={t}>{TIERS[t].label} - {TIERS[t].name}</option>)}
              </select>
            </label>
            <label>
              <span>Vai trò</span>
              <select value={member.role} onChange={(e) => onChange({ ...member, role: e.target.value as Role })}>
                {(Object.keys(ROLE_LABEL) as Role[]).map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
              </select>
            </label>
            <label className="sc-span-2">
              <span>Link ảnh đại diện (tùy chọn)</span>
              <input value={avatar} onChange={(e) => { setAvatar(e.target.value); setAvatarError(''); }} onBlur={saveAvatar} placeholder="https://..." maxLength={400} />
              {avatarError && <small className="sc-error" role="alert">{avatarError}</small>}
            </label>
            {fundUnlocked ? (
              <button type="button" className={`sc-btn ${paidThisMonth ? 'ghost' : ''} sc-span-2`} onClick={() => onTogglePaid(member.id, thisMonth)}>
                <i className={`bx ${paidThisMonth ? 'bx-undo' : 'bx-check'}`} aria-hidden="true"></i>
                {paidThisMonth ? 'Đánh dấu chưa đóng' : 'Đánh dấu đã đóng quỹ'}
              </button>
            ) : (
              <p className="sc-muted sc-span-2"><i className="bx bx-lock-alt" aria-hidden="true"></i> Mở khóa quỹ ở tab Quỹ để cập nhật đóng quỹ.</p>
            )}
          </div>
        )}

        <div className="sc-history">
          <h3>Lịch sử đóng quỹ</h3>
          {paidMonths.length ? (
            <div className="sc-chips">{paidMonths.map((m) => <span key={m} className="sc-chip ok">{monthLabel(m)}</span>)}</div>
          ) : (
            <p className="sc-muted">Chưa có tháng nào được ghi nhận.</p>
          )}
        </div>

        {isAdmin && paidMonths.length > 0 && !fundUnlocked && (
          <p className="sc-muted sc-remove-hint">Thành viên này có lịch sử đóng quỹ, cần mở khóa quỹ để xóa.</p>
        )}
        {isAdmin && (paidMonths.length === 0 || fundUnlocked) && (
          <button type="button" className="sc-link-danger" onClick={() => {
            if (window.confirm(`Xóa ${member.name} khỏi nhóm? Lịch sử đóng quỹ và đội hình của người này cũng sẽ bị xóa.`)) onRemove(member.id);
          }}>
            <i className="bx bx-trash" aria-hidden="true"></i> Xóa thành viên
          </button>
        )}
      </div>
    </div>
  );
};

export default MemberDetail;
