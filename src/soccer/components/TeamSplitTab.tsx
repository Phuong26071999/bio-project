import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Member, SoccerState } from '../types';
import { splitTeams, tierCounts } from '../teamSplit';
import { TIERS, formatMatchDate, teamPower } from '../utils';
import Avatar from './Avatar';

interface Props {
  state: SoccerState;
  isAdmin: boolean;
  onSaveToMatch: (matchId: string, teams: string[][]) => void;
}

type Zone = 'team1' | 'team2' | 'bench' | 'absent';
const ZONE_LABEL: Record<Zone, string> = { team1: 'Đội 1', team2: 'Đội 2', bench: 'Chưa xếp', absent: 'Vắng' };
const isUpcoming = (date: string) => new Date(date).getTime() >= Date.now() - 3 * 3600 * 1000;

/** Starts from the next match's saved lineup when there is one. */
function initialZones(state: SoccerState): Record<string, Zone> {
  const next = state.matches.filter((m) => isUpcoming(m.date)).sort((a, b) => a.date.localeCompare(b.date))[0];
  const zones: Record<string, Zone> = {};
  if (next && next.teams.length === 2) {
    next.teams[0].forEach((id) => { zones[id] = 'team1'; });
    next.teams[1].forEach((id) => { zones[id] = 'team2'; });
  }
  return zones;
}

const TeamSplitTab = ({ state, isAdmin, onSaveToMatch }: Props) => {
  const [zones, setZones] = useState<Record<string, Zone>>(() => initialZones(state));
  const [selected, setSelected] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overZone, setOverZone] = useState<Zone | null>(null);
  const [copied, setCopied] = useState(false);
  const [matchId, setMatchId] = useState('');
  const ghostRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: string; x: number; y: number; active: boolean } | null>(null);
  const suppressClick = useRef(false);

  const zoneOf = useCallback((id: string): Zone => zones[id] || 'bench', [zones]);
  const byZone = useMemo(() => {
    const groups: Record<Zone, Member[]> = { team1: [], team2: [], bench: [], absent: [] };
    state.members.forEach((m) => groups[zoneOf(m.id)].push(m));
    (Object.keys(groups) as Zone[]).forEach((z) => groups[z].sort((a, b) => b.tier - a.tier || a.name.localeCompare(b.name, 'vi')));
    return groups;
  }, [state.members, zoneOf]);
  const upcoming = state.matches.filter((m) => isUpcoming(m.date)).sort((a, b) => a.date.localeCompare(b.date));
  const playing = state.members.filter((m) => zoneOf(m.id) !== 'absent');
  const selectedMember = state.members.find((m) => m.id === selected) || null;

  const move = (id: string, zone: Zone) => {
    setZones((prev) => ({ ...prev, [id]: zone }));
    setSelected(null);
  };

  const randomize = () => {
    const [t1, t2] = splitTeams(playing, 2);
    const next: Record<string, Zone> = {};
    state.members.forEach((m) => { next[m.id] = zoneOf(m.id) === 'absent' ? 'absent' : 'bench'; });
    t1.forEach((m) => { next[m.id] = 'team1'; });
    t2.forEach((m) => { next[m.id] = 'team2'; });
    setZones(next);
    setSelected(null);
  };

  const reset = () => {
    setZones((prev) => Object.fromEntries(state.members.map((m) => [m.id, prev[m.id] === 'absent' ? 'absent' : 'bench'])) as Record<string, Zone>);
    setSelected(null);
  };

  // Pointer-based drag: works with mouse anywhere on a chip and with touch from the grip handle.
  const zoneAt = (x: number, y: number): Zone | null => {
    const el = document.elementFromPoint(x, y)?.closest('[data-zone]');
    return (el?.getAttribute('data-zone') as Zone) || null;
  };
  const onPointerDown = (e: React.PointerEvent, id: string) => {
    if (e.button !== 0) return;
    if (e.pointerType === 'touch' && !(e.target as Element).closest('.sc-grip')) return;
    drag.current = { id, x: e.clientX, y: e.clientY, active: false };
    try {
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
    } catch {
      // Pointer already released; the drag still works without capture.
    }
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    if (!d.active && Math.hypot(e.clientX - d.x, e.clientY - d.y) > 5) {
      d.active = true;
      setDraggingId(d.id);
      setSelected(null);
    }
    if (!d.active) return;
    if (ghostRef.current) ghostRef.current.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
    // Auto-scroll near the top/bottom edge so off-screen zones (e.g. the bench on phones) are reachable.
    const edge = 70;
    // 'instant' overrides the site-wide smooth scrolling, which lags behind the finger.
    if (e.clientY > window.innerHeight - edge) window.scrollBy({ top: 14, behavior: 'instant' as ScrollBehavior });
    else if (e.clientY < edge + 80) window.scrollBy({ top: -14, behavior: 'instant' as ScrollBehavior });
    const zone = zoneAt(e.clientX, e.clientY);
    setOverZone((prev) => (prev === zone ? prev : zone));
  };
  const endDrag = (e: React.PointerEvent, cancelled = false) => {
    const d = drag.current;
    drag.current = null;
    if (d?.active) {
      suppressClick.current = true;
      const zone = cancelled ? null : zoneAt(e.clientX, e.clientY);
      if (zone) move(d.id, zone);
    }
    setDraggingId(null);
    setOverZone(null);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setSelected(null);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const shareText = ['team1', 'team2']
    .map((z) => `${ZONE_LABEL[z as Zone]} (sức mạnh ${teamPower(byZone[z as Zone])}): ${byZone[z as Zone].map((m) => m.name).join(', ') || 'chưa có ai'}`)
    .join('\n');
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('Sao chép danh sách đội:', shareText);
    }
  };

  const chip = (m: Member, variant: 'token' | 'pill') => (
    <button key={m.id} type="button"
      className={`sc-${variant}${selected === m.id ? ' selected' : ''}${draggingId === m.id ? ' lifted' : ''}`}
      aria-pressed={selected === m.id}
      aria-label={`${m.name}, tier ${TIERS[m.tier].label}. Bấm để chọn rồi bấm khu vực muốn chuyển tới.`}
      onPointerDown={(e) => onPointerDown(e, m.id)} onPointerMove={onPointerMove}
      onPointerUp={(e) => endDrag(e)} onPointerCancel={(e) => endDrag(e, true)}
      onClick={() => {
        if (suppressClick.current) { suppressClick.current = false; return; }
        setSelected((cur) => (cur === m.id ? null : m.id));
      }}>
      <span className="sc-grip" aria-hidden="true"><i className="bx bx-grid-vertical"></i></span>
      <span className="sc-token-avatar"><Avatar member={m} size={variant === 'token' ? 40 : 30} /><span className={`sc-tier t${m.tier}`}>{TIERS[m.tier].label}</span></span>
      <span className="sc-token-name">{m.name}</span>
    </button>
  );

  const dropTarget = (zone: Zone) => selectedMember && zoneOf(selectedMember.id) !== zone && (
    <button type="button" className="sc-drop-here" onClick={() => move(selectedMember.id, zone)}>
      <i className="bx bx-down-arrow-circle" aria-hidden="true"></i> Chuyển {selectedMember.name} vào {ZONE_LABEL[zone]}
    </button>
  );

  const half = (zone: 'team1' | 'team2') => {
    const team = byZone[zone];
    return (
      <div className={`sc-half ${zone}${overZone === zone ? ' over' : ''}`} data-zone={zone}>
        <div className="sc-half-head">
          <h3><span className="sc-kit" aria-hidden="true"></span>{ZONE_LABEL[zone]}</h3>
          <div className="sc-half-score"><b>{teamPower(team)}</b><small>sức mạnh</small></div>
        </div>
        <div className="sc-half-meta">
          <span>{team.length} người</span>
          {tierCounts(team).map(({ tier, count }) => <span key={tier} className={`sc-tier-count t${tier}`}>{TIERS[tier].label}×{count}</span>)}
        </div>
        {dropTarget(zone)}
        <div className="sc-tokens">
          {team.map((m) => chip(m, 'token'))}
          {!team.length && <p className="sc-zone-empty">Kéo cầu thủ vào đây</p>}
        </div>
      </div>
    );
  };

  const diff = Math.abs(teamPower(byZone.team1) - teamPower(byZone.team2));
  return (
    <section aria-label="Chia đội" className="sc-split">
      <div className="sc-split-bar">
        <div>
          <h2 className="sc-h2">Chia đội</h2>
          <p className="sc-muted">Kéo cầu thủ vào sân, hoặc bấm chọn một người rồi bấm khu vực muốn chuyển tới.</p>
        </div>
        <div className="sc-row-gap">
          <button type="button" className="sc-btn" onClick={randomize} disabled={playing.length < 2}>
            <i className="bx bx-shuffle" aria-hidden="true"></i>Chia ngẫu nhiên
          </button>
          <button type="button" className="sc-btn ghost" onClick={reset}><i className="bx bx-reset" aria-hidden="true"></i>Xếp lại</button>
        </div>
      </div>

      <div className="sc-pitch">
        {half('team1')}
        <div className="sc-pitch-center" aria-hidden="true">
          <span className={`sc-balance${diff <= 2 ? ' fair' : ''}`}>{diff === 0 ? 'Cân bằng' : `Lệch ${diff}`}</span>
        </div>
        {half('team2')}
      </div>

      <div className="sc-sidelines">
        {(['bench', 'absent'] as const).map((zone) => (
          <div key={zone} className={`sc-sideline ${zone}${overZone === zone ? ' over' : ''}`} data-zone={zone}>
            <div className="sc-sideline-head">
              <h3><i className={`bx ${zone === 'bench' ? 'bx-chair' : 'bx-user-x'}`} aria-hidden="true"></i>{ZONE_LABEL[zone]}</h3>
              <span>{byZone[zone].length}</span>
            </div>
            {dropTarget(zone)}
            <div className="sc-chips-row">
              {byZone[zone].map((m) => chip(m, 'pill'))}
              {!byZone[zone].length && <p className="sc-zone-empty">{zone === 'bench' ? 'Mọi người đã có đội' : 'Kéo người không đi đá vào đây'}</p>}
            </div>
          </div>
        ))}
      </div>

      <div className="sc-split-actions">
        <button type="button" className="sc-btn ghost" onClick={copy}>
          <i className={`bx ${copied ? 'bx-check' : 'bx-copy'}`} aria-hidden="true"></i>{copied ? 'Đã sao chép' : 'Sao chép gửi nhóm'}
        </button>
        {isAdmin && (upcoming.length ? (
          <div className="sc-save-match">
            <label className="sc-select">
              <span>Lưu vào trận</span>
              <select value={matchId} onChange={(e) => setMatchId(e.target.value)}>
                <option value="">Chọn trận sắp đá</option>
                {upcoming.map((m) => <option key={m.id} value={m.id}>{formatMatchDate(m.date)} - {m.location}</option>)}
              </select>
            </label>
            <button type="button" className="sc-btn" disabled={!matchId || !byZone.team1.length || !byZone.team2.length}
              onClick={() => { onSaveToMatch(matchId, [byZone.team1.map((m) => m.id), byZone.team2.map((m) => m.id)]); setMatchId(''); }}>
              Lưu đội hình
            </button>
          </div>
        ) : <small className="sc-muted">Tạo trận ở tab Lịch đá để lưu đội hình.</small>)}
      </div>

      <div className="sc-ghost" ref={ghostRef} aria-hidden="true" hidden={!draggingId}>
        {draggingId && (() => {
          const m = state.members.find((x) => x.id === draggingId);
          return m ? <span className="sc-chip-ghost"><Avatar member={m} size={30} />{m.name}</span> : null;
        })()}
      </div>
    </section>
  );
};

export default TeamSplitTab;
