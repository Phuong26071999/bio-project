import React, { useEffect, useState } from 'react';
import { Expense, SoccerState } from '../types';
import { formatMoney, monthKey, monthLabel, randomId } from '../utils';
import Avatar from './Avatar';

interface Props {
  state: SoccerState;
  /** True once the fund is unlocked with the PIN. */
  isAdmin: boolean;
  lockState: 'locked' | 'unlocked' | 'disabled';
  onUnlock: () => void;
  onLock: () => void;
  onTogglePaid: (memberId: string, month: string) => void;
  onSetFee: (fee: number) => void;
  onAddExpense: (expense: Expense) => void;
  onRemoveExpense: (id: string) => void;
}

const today = () => new Date().toISOString().slice(0, 10);

const FundTab = ({ state, isAdmin, lockState, onUnlock, onLock, onTogglePaid, onSetFee, onAddExpense, onRemoveExpense }: Props) => {
  const [month, setMonth] = useState(monthKey());
  const [feeDraft, setFeeDraft] = useState(String(state.fund.fee));
  const [exp, setExp] = useState({ date: today(), note: '', amount: '' });
  const [expError, setExpError] = useState('');
  const { fund, members } = state;
  useEffect(() => setFeeDraft(String(fund.fee)), [fund.fee]);

  const paid = new Set(fund.payments[month] || []);
  const paidMembers = members.filter((m) => paid.has(m.id));
  const unpaidMembers = members.filter((m) => !paid.has(m.id));
  // Totals assume the current fee applied to every recorded month.
  const totalPaidCount = Object.values(fund.payments).reduce((sum, ids) => sum + ids.length, 0);
  const totalIn = totalPaidCount * fund.fee;
  const totalOut = fund.expenses.reduce((sum, e) => sum + e.amount, 0);
  const monthExpenses = fund.expenses.filter((e) => e.date.startsWith(month));
  const percent = members.length ? Math.round((paidMembers.length / members.length) * 100) : 0;

  const submitExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(exp.amount.replace(/[^\d]/g, ''));
    if (!exp.note.trim()) { setExpError('Nhập nội dung khoản chi.'); return; }
    if (!amount) { setExpError('Nhập số tiền lớn hơn 0.'); return; }
    onAddExpense({ id: randomId(), date: exp.date, note: exp.note.trim().slice(0, 120), amount });
    setExp({ date: today(), note: '', amount: '' });
    setExpError('');
  };

  return (
    <section aria-label="Quỹ">
      {lockState !== 'disabled' && (
        <div className={`sc-lockbar${isAdmin ? ' open' : ''}`}>
          <i className={`bx ${isAdmin ? 'bx-lock-open-alt' : 'bx-lock-alt'}`} aria-hidden="true"></i>
          <span className="sc-grow">{isAdmin ? 'Quỹ đang mở khóa, bạn có thể ghi nhận đóng quỹ và khoản chi.' : 'Quỹ đang khóa. Nhập mã PIN để cập nhật.'}</span>
          {isAdmin
            ? <button type="button" className="sc-btn ghost small" onClick={onLock}>Khóa lại</button>
            : <button type="button" className="sc-btn small" onClick={onUnlock}>Mở khóa quỹ</button>}
        </div>
      )}
      <div className="sc-fund-top">
        <label className="sc-select">
          <span>Tháng</span>
          <input type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} />
        </label>
        {isAdmin ? (
          <form className="sc-fee" onSubmit={(e) => { e.preventDefault(); const v = Number(feeDraft.replace(/[^\d]/g, '')); if (v >= 0) onSetFee(v); }}>
            <label htmlFor="sc-fee">Tiền quỹ mỗi tháng</label>
            <div><input id="sc-fee" inputMode="numeric" value={feeDraft} onChange={(e) => setFeeDraft(e.target.value)} /><button className="sc-btn small" type="submit">Lưu</button></div>
          </form>
        ) : (
          <span className="sc-muted">Tiền quỹ: <b>{formatMoney(fund.fee)}</b>/người/tháng</span>
        )}
      </div>

      <div className="sc-stats">
        <div className="sc-stat">
          <small>Đã đóng {monthLabel(month).toLowerCase()}</small>
          <b>{paidMembers.length}/{members.length}</b>
          <span className="sc-progress" aria-hidden="true"><span style={{ width: `${percent}%` }}></span></span>
        </div>
        <div className="sc-stat"><small>Thu trong tháng</small><b>{formatMoney(paidMembers.length * fund.fee)}</b><span>còn thiếu {formatMoney(unpaidMembers.length * fund.fee)}</span></div>
        <div className="sc-stat"><small>Tổng đã thu</small><b>{formatMoney(totalIn)}</b><span>{totalPaidCount} lượt đóng</span></div>
        <div className="sc-stat"><small>Tổng đã chi</small><b>{formatMoney(totalOut)}</b><span>{fund.expenses.length} khoản</span></div>
        <div className="sc-stat highlight"><small>Số dư quỹ</small><b>{formatMoney(totalIn - totalOut)}</b></div>
      </div>

      <div className="sc-two">
        <div className="sc-panel">
          <h3>Chưa đóng <small>{unpaidMembers.length}</small></h3>
          <ul className="sc-paylist">
            {unpaidMembers.map((m) => (
              <li key={m.id}>
                <Avatar member={m} size={30} /><span className="sc-grow">{m.name}</span>
                {isAdmin && <button type="button" className="sc-btn small" onClick={() => onTogglePaid(m.id, month)}>Đã đóng</button>}
              </li>
            ))}
            {!unpaidMembers.length && <li className="sc-muted">Cả nhóm đã đóng đủ.</li>}
          </ul>
        </div>
        <div className="sc-panel">
          <h3>Đã đóng <small>{paidMembers.length}</small></h3>
          <ul className="sc-paylist">
            {paidMembers.map((m) => (
              <li key={m.id}>
                <Avatar member={m} size={30} /><span className="sc-grow">{m.name}</span>
                <i className="bx bx-check-circle sc-ok" aria-label="Đã đóng"></i>
                {isAdmin && <button type="button" className="sc-btn ghost small" onClick={() => onTogglePaid(m.id, month)}>Hoàn tác</button>}
              </li>
            ))}
            {!paidMembers.length && <li className="sc-muted">Chưa ai đóng tháng này.</li>}
          </ul>
        </div>
      </div>

      <div className="sc-panel">
        <h3>Khoản chi {monthLabel(month).toLowerCase()}</h3>
        {monthExpenses.length ? (
          <ul className="sc-expenses">
            {monthExpenses.map((e) => (
              <li key={e.id}>
                <span className="sc-muted">{e.date.split('-').reverse().join('/')}</span>
                <span className="sc-grow">{e.note}</span>
                <b>{formatMoney(e.amount)}</b>
                {isAdmin && <button type="button" className="sc-icon-btn" aria-label={`Xóa khoản chi ${e.note}`} onClick={() => window.confirm(`Xóa khoản chi "${e.note}"?`) && onRemoveExpense(e.id)}><i className="bx bx-trash"></i></button>}
              </li>
            ))}
          </ul>
        ) : <p className="sc-muted">Chưa có khoản chi nào trong tháng.</p>}

        {isAdmin && (
          <form className="sc-expense-form" onSubmit={submitExpense} noValidate>
            <label><span>Ngày</span><input type="date" value={exp.date} onChange={(e) => setExp({ ...exp, date: e.target.value || today() })} /></label>
            <label className="sc-grow"><span>Nội dung</span><input value={exp.note} maxLength={120} placeholder="Tiền sân, nước, áo..." onChange={(e) => { setExp({ ...exp, note: e.target.value }); setExpError(''); }} /></label>
            <label><span>Số tiền (đ)</span><input inputMode="numeric" value={exp.amount} placeholder="300000" onChange={(e) => { setExp({ ...exp, amount: e.target.value }); setExpError(''); }} /></label>
            <button type="submit" className="sc-btn">Thêm khoản chi</button>
            {expError && <small className="sc-error" role="alert">{expError}</small>}
          </form>
        )}
      </div>
    </section>
  );
};

export default FundTab;
