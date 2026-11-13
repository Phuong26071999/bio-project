import React, { useState } from 'react';
import { Match, SoccerState } from '../types';
import { formatMatchDate, randomId } from '../utils';
import Avatar from './Avatar';

interface Props {
  state: SoccerState;
  isAdmin: boolean;
  onAdd: (match: Match) => void;
  onUpdate: (match: Match) => void;
  onRemove: (id: string) => void;
}

const TEAM_NAMES = ['Đội 1', 'Đội 2', 'Đội 3', 'Đội 4'];
// Matches stay "upcoming" for 3 hours after kick-off.
const isUpcoming = (m: Match) => new Date(m.date).getTime() >= Date.now() - 3 * 3600 * 1000;

const MatchCard = ({ match, state, isAdmin, onUpdate, onRemove, featured }: {
  match: Match; state: SoccerState; isAdmin: boolean; featured?: boolean;
  onUpdate: (m: Match) => void; onRemove: (id: string) => void;
}) => {
  const [score, setScore] = useState(match.score);
  const byId = new Map(state.members.map((m) => [m.id, m]));
  const d = new Date(match.date);
  const valid = !Number.isNaN(d.getTime());
  return (
    <article className={`sc-match${featured ? ' featured' : ''}`}>
      <div className="sc-match-head">
        <div className="sc-date-block" aria-hidden="true">
          <small>{valid ? d.toLocaleDateString('vi-VN', { weekday: 'short' }) : ''}</small>
          <b>{valid ? String(d.getDate()).padStart(2, '0') : '--'}</b>
          <small>{valid ? `Th${d.getMonth() + 1}` : ''}</small>
        </div>
        <div className="sc-match-info">
          {featured && <span className="sc-chip ok">Trận sắp tới</span>}
          <h3>{formatMatchDate(match.date)}</h3>
          <p><i className="bx bx-map" aria-hidden="true"></i> {match.location}</p>
          {match.note && <p className="sc-muted">{match.note}</p>}
        </div>
        <div className="sc-score">
          {isAdmin ? (
            <input value={score} maxLength={20} placeholder="0 - 0" aria-label="Tỉ số"
              onChange={(e) => setScore(e.target.value)} onBlur={() => score !== match.score && onUpdate({ ...match, score: score.trim() })} />
          ) : match.score ? <b>{match.score}</b> : <span className="sc-muted">Chưa có tỉ số</span>}
        </div>
      </div>
      {match.teams.length > 0 && (
        <div className={`sc-match-teams n${match.teams.length}`}>
          {match.teams.map((team, i) => (
            <div key={i} className={`sc-mini-team c${i}`}>
              <b>{TEAM_NAMES[i]}</b>
              <div className="sc-avatars">
                {team.map((id) => byId.get(id)).filter(Boolean).map((m) => (
                  <span key={m!.id} title={m!.name}><Avatar member={m!} size={28} /></span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      {isAdmin && (
        <div className="sc-match-actions">
          {match.teams.length > 0 && <button type="button" className="sc-btn ghost small" onClick={() => onUpdate({ ...match, teams: [] })}>Xóa đội hình</button>}
          <button type="button" className="sc-link-danger" onClick={() => window.confirm('Xóa trận này?') && onRemove(match.id)}>
            <i className="bx bx-trash" aria-hidden="true"></i> Xóa trận
          </button>
        </div>
      )}
    </article>
  );
};

const ScheduleTab = ({ state, isAdmin, onAdd, onUpdate, onRemove }: Props) => {
  const [form, setForm] = useState({ date: '', location: '', note: '' });
  const [error, setError] = useState('');
  const upcoming = state.matches.filter(isUpcoming).sort((a, b) => a.date.localeCompare(b.date));
  const past = state.matches.filter((m) => !isUpcoming(m)).sort((a, b) => b.date.localeCompare(a.date));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.date) { setError('Chọn ngày giờ đá.'); return; }
    if (!form.location.trim()) { setError('Nhập địa điểm sân.'); return; }
    onAdd({ id: randomId(), date: form.date, location: form.location.trim(), note: form.note.trim(), score: '', teams: [] });
    setForm({ date: '', location: form.location, note: '' });
    setError('');
  };

  const cardProps = { state, isAdmin, onUpdate, onRemove };
  return (
    <section aria-label="Lịch đá">
      {isAdmin && (
        <form className="sc-panel sc-match-form" onSubmit={submit} noValidate>
          <h3>Tạo lịch đá</h3>
          <div className="sc-form-grid">
            <label><span>Ngày giờ</span><input type="datetime-local" value={form.date} onChange={(e) => { setForm({ ...form, date: e.target.value }); setError(''); }} /></label>
            <label><span>Địa điểm</span><input value={form.location} maxLength={120} placeholder="Tên sân" onChange={(e) => { setForm({ ...form, location: e.target.value }); setError(''); }} /></label>
            <label className="sc-span-2"><span>Ghi chú (tùy chọn)</span><input value={form.note} maxLength={200} placeholder="Mang áo màu, tiền sân..." onChange={(e) => setForm({ ...form, note: e.target.value })} /></label>
          </div>
          {error && <small className="sc-error" role="alert">{error}</small>}
          <button type="submit" className="sc-btn"><i className="bx bx-calendar-plus" aria-hidden="true"></i>Tạo trận</button>
        </form>
      )}

      <h3 className="sc-section-title">Sắp diễn ra</h3>
      {upcoming.length ? (
        <div className="sc-match-list">
          {upcoming.map((m, i) => <MatchCard key={m.id} match={m} featured={i === 0} {...cardProps} />)}
        </div>
      ) : (
        <p className="sc-empty">Chưa có lịch đá nào sắp tới.{isAdmin ? ' Tạo trận ở form phía trên.' : ''}</p>
      )}

      {past.length > 0 && (
        <>
          <h3 className="sc-section-title">Đã đá</h3>
          <div className="sc-match-list">{past.map((m) => <MatchCard key={m.id} match={m} {...cardProps} />)}</div>
        </>
      )}
    </section>
  );
};

export default ScheduleTab;
