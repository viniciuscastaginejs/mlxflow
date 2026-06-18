'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  STATUS_LABEL,
  REVENUE_TYPE_LABEL,
  type RevenueRow,
  type RevenueType,
  type InstallmentStatus,
} from '@/lib/queries/financeiro';
import { brl } from '@/lib/format';
import { createRevenue, updateRevenueInstallment } from '../financeiro/actions';
import { CloseIcon } from '../_icons';

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function total(installments: { amount: number }[]) {
  return installments.reduce((acc, i) => acc + i.amount, 0);
}

export default function ClienteFinanceiroGrid({
  clientId,
  year,
  revenues: revenuesProp,
  canManage,
}: {
  clientId: string;
  year: number;
  revenues: RevenueRow[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [revenues, setRevenues] = useState(revenuesProp);
  const [modalOpen, setModalOpen] = useState(false);
  const [toast, setToast] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  useEffect(() => setRevenues(revenuesProp), [revenuesProp]);

  function showToast(type: 'error' | 'success', text: string) {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3500);
  }

  async function handleAmount(revenueId: string, installmentId: string, status: InstallmentStatus, value: string) {
    const amount = Number(value) || 0;
    const anterior = revenues;
    setRevenues((prev) =>
      prev.map((r) =>
        r.id !== revenueId
          ? r
          : { ...r, installments: r.installments.map((i) => (i.id === installmentId ? { ...i, amount } : i)) }
      )
    );
    const res = await updateRevenueInstallment(installmentId, amount, status);
    if (!res.ok) {
      setRevenues(anterior);
      showToast('error', res.error);
    } else {
      router.refresh();
    }
  }

  async function handleStatus(revenueId: string, installmentId: string, amount: number, status: InstallmentStatus) {
    const anterior = revenues;
    setRevenues((prev) =>
      prev.map((r) =>
        r.id !== revenueId
          ? r
          : { ...r, installments: r.installments.map((i) => (i.id === installmentId ? { ...i, status } : i)) }
      )
    );
    const res = await updateRevenueInstallment(installmentId, amount, status);
    if (!res.ok) {
      setRevenues(anterior);
      showToast('error', res.error);
    } else {
      router.refresh();
    }
  }

  return (
    <div className="card">
      {toast && <div className={`toast toast--${toast.type}`}>{toast.text}</div>}

      <div className="fin-section-head">
        <h2 className="card-title">Pagamentos por mês ({year})</h2>
        {canManage && (
          <button className="btn btn--inline btn--sm" onClick={() => setModalOpen(true)}>
            Nova receita
          </button>
        )}
      </div>

      <div className="grid-wrap">
        <table className="grid-table">
          <thead>
            <tr>
              <th>Receita</th>
              {MESES.map((m) => (
                <th key={m}>{m}</th>
              ))}
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {revenues.length === 0 ? (
              <tr>
                <td colSpan={14} className="grid-empty">
                  Nenhuma receita cadastrada para {year}.
                </td>
              </tr>
            ) : (
              revenues.map((r) => (
                <tr key={r.id}>
                  <td>
                    <div className="grid-label-main">{r.description ?? REVENUE_TYPE_LABEL[r.type]}</div>
                    <div className="grid-label-meta">{REVENUE_TYPE_LABEL[r.type]}</div>
                  </td>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
                    const inst = r.installments.find((x) => x.month === month);
                    if (!inst) return <td key={month}>—</td>;
                    return (
                      <td key={month}>
                        <div className="grid-cell">
                          <input
                            key={`amt-${inst.id}-${inst.amount}`}
                            type="number"
                            className="grid-cell-input"
                            defaultValue={inst.amount || ''}
                            disabled={!canManage}
                            onBlur={(e) => handleAmount(r.id, inst.id, inst.status, e.target.value)}
                          />
                          <select
                            className={`grid-cell-status is-${inst.status}`}
                            value={inst.status}
                            disabled={!canManage}
                            onChange={(e) =>
                              handleStatus(r.id, inst.id, inst.amount, e.target.value as InstallmentStatus)
                            }
                          >
                            {Object.entries(STATUS_LABEL).map(([v, l]) => (
                              <option key={v} value={v}>
                                {l}
                              </option>
                            ))}
                          </select>
                        </div>
                      </td>
                    );
                  })}
                  <td className="grid-row-total">{brl(total(r.installments))}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <NovaReceitaModal
          clientId={clientId}
          year={year}
          onClose={() => setModalOpen(false)}
          onCreated={() => {
            setModalOpen(false);
            showToast('success', 'Receita criada.');
            router.refresh();
          }}
          onError={(m) => showToast('error', m)}
        />
      )}
    </div>
  );
}

function NovaReceitaModal({
  clientId,
  year,
  onClose,
  onCreated,
  onError,
}: {
  clientId: string;
  year: number;
  onClose: () => void;
  onCreated: () => void;
  onError: (m: string) => void;
}) {
  const [type, setType] = useState<RevenueType>('recorrente');
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await createRevenue(year, {
      clientId,
      description: null,
      type,
      month: type === 'servico_unico' ? month : null,
    });
    setSaving(false);
    if (!res.ok) {
      onError(res.error);
      return;
    }
    onCreated();
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>Nova receita</h2>
          <button className="modal-close" onClick={onClose} type="button">
            <CloseIcon />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="field-lt">
            <label htmlFor="type">Tipo</label>
            <select id="type" value={type} onChange={(e) => setType(e.target.value as RevenueType)}>
              <option value="recorrente">Recorrente</option>
              <option value="servico_unico">Único</option>
            </select>
          </div>
          {type === 'servico_unico' && (
            <div className="field-lt">
              <label htmlFor="month">Mês da receita</label>
              <select id="month" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
                {MESES.map((label, i) => (
                  <option key={label} value={i + 1}>
                    {label}
                  </option>
                ))}
              </select>
              <p className="grid-label-meta" style={{ marginTop: 6 }}>
                Os outros meses ficam travados, já que é um pagamento único.
              </p>
            </div>
          )}
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" className="btn btn--inline" disabled={saving}>
              {saving ? 'Salvando...' : 'Criar'}
            </button>
            <button type="button" className="btn--secondary" onClick={onClose}>
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
