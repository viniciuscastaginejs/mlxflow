'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  REVENUE_TYPE_LABEL,
  STATUS_LABEL,
  CATEGORY_LABEL,
  PARTNER_TYPE_LABEL,
  type RevenueRow,
  type ExpenseRow,
  type PartnerRow,
  type MonthlyTotal,
  type RevenueType,
  type InstallmentStatus,
  type ExpenseCategory,
  type PartnerType,
} from '@/lib/queries/financeiro';
import { brl } from '@/lib/format';
import {
  createRevenue,
  createExpense,
  createPartnerPayment,
  updateRevenueInstallment,
  updateExpenseInstallment,
  updatePartnerInstallment,
} from './actions';
import { CloseIcon } from '../_icons';

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function total(installments: { amount: number }[]) {
  return installments.reduce((acc, i) => acc + i.amount, 0);
}

export default function FinanceiroClient({
  year,
  revenues: revenuesProp,
  expenses: expensesProp,
  partners: partnersProp,
  monthlyTotals,
  clientes,
  canManage,
}: {
  year: number;
  revenues: RevenueRow[];
  expenses: ExpenseRow[];
  partners: PartnerRow[];
  monthlyTotals: MonthlyTotal[];
  clientes: { id: string; name: string }[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [revenues, setRevenues] = useState(revenuesProp);
  const [expenses, setExpenses] = useState(expensesProp);
  const [partners, setPartners] = useState(partnersProp);
  const [modal, setModal] = useState<'revenue' | 'expense' | 'partner' | null>(null);
  const [toast, setToast] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  useEffect(() => setRevenues(revenuesProp), [revenuesProp]);
  useEffect(() => setExpenses(expensesProp), [expensesProp]);
  useEffect(() => setPartners(partnersProp), [partnersProp]);

  function showToast(type: 'error' | 'success', text: string) {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3500);
  }

  async function handleRevenueAmount(revenueId: string, installmentId: string, status: InstallmentStatus, value: string) {
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

  async function handleRevenueStatus(revenueId: string, installmentId: string, amount: number, status: InstallmentStatus) {
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

  async function handleExpenseAmount(expenseId: string, installmentId: string, value: string) {
    const amount = Number(value) || 0;
    const anterior = expenses;
    setExpenses((prev) =>
      prev.map((e) =>
        e.id !== expenseId
          ? e
          : { ...e, installments: e.installments.map((i) => (i.id === installmentId ? { ...i, amount } : i)) }
      )
    );
    const res = await updateExpenseInstallment(installmentId, amount);
    if (!res.ok) {
      setExpenses(anterior);
      showToast('error', res.error);
    } else {
      router.refresh();
    }
  }

  async function handlePartnerAmount(partnerId: string, installmentId: string, value: string) {
    const amount = Number(value) || 0;
    const anterior = partners;
    setPartners((prev) =>
      prev.map((p) =>
        p.id !== partnerId
          ? p
          : { ...p, installments: p.installments.map((i) => (i.id === installmentId ? { ...i, amount } : i)) }
      )
    );
    const res = await updatePartnerInstallment(installmentId, amount);
    if (!res.ok) {
      setPartners(anterior);
      showToast('error', res.error);
    } else {
      router.refresh();
    }
  }

  function onCreated(message: string) {
    setModal(null);
    showToast('success', message);
    router.refresh();
  }

  const totalReceita = monthlyTotals.reduce((a, m) => a + m.receita, 0);
  const totalDespesa = monthlyTotals.reduce((a, m) => a + m.despesa, 0);
  const totalParceiros = monthlyTotals.reduce((a, m) => a + m.parceiros, 0);
  const totalLucro = monthlyTotals.reduce((a, m) => a + m.lucroLiquido, 0);

  return (
    <>
      {toast && <div className={`toast toast--${toast.type}`}>{toast.text}</div>}

      <section className="fin-section">
        <div className="fin-section-head">
          <h2 className="card-title">Receita</h2>
          {canManage && (
            <button className="btn btn--inline btn--sm" onClick={() => setModal('revenue')}>
              Nova receita
            </button>
          )}
        </div>
        <div className="grid-wrap">
          <table className="grid-table">
            <thead>
              <tr>
                <th>Cliente / Descrição</th>
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
                      <div className="grid-label-main">{r.clientName ?? r.description ?? '(sem nome)'}</div>
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
                              onBlur={(e) => handleRevenueAmount(r.id, inst.id, inst.status, e.target.value)}
                            />
                            <select
                              className={`grid-cell-status is-${inst.status}`}
                              value={inst.status}
                              disabled={!canManage}
                              onChange={(e) =>
                                handleRevenueStatus(r.id, inst.id, inst.amount, e.target.value as InstallmentStatus)
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
      </section>

      <section className="fin-section">
        <div className="fin-section-head">
          <h2 className="card-title">Despesas</h2>
          {canManage && (
            <button className="btn btn--inline btn--sm" onClick={() => setModal('expense')}>
              Nova despesa
            </button>
          )}
        </div>
        <div className="grid-wrap">
          <table className="grid-table">
            <thead>
              <tr>
                <th>Descrição</th>
                {MESES.map((m) => (
                  <th key={m}>{m}</th>
                ))}
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan={14} className="grid-empty">
                    Nenhuma despesa cadastrada para {year}.
                  </td>
                </tr>
              ) : (
                expenses.map((e) => (
                  <tr key={e.id}>
                    <td>
                      <div className="grid-label-main">{e.description}</div>
                      <div className="grid-label-meta">{CATEGORY_LABEL[e.category]}</div>
                    </td>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
                      const inst = e.installments.find((x) => x.month === month);
                      if (!inst) return <td key={month}>—</td>;
                      return (
                        <td key={month}>
                          <input
                            key={`amt-${inst.id}-${inst.amount}`}
                            type="number"
                            className="grid-cell-input"
                            defaultValue={inst.amount || ''}
                            disabled={!canManage}
                            onBlur={(ev) => handleExpenseAmount(e.id, inst.id, ev.target.value)}
                          />
                        </td>
                      );
                    })}
                    <td className="grid-row-total">{brl(total(e.installments))}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="fin-section">
        <div className="fin-section-head">
          <h2 className="card-title">Parceiros</h2>
          {canManage && (
            <button className="btn btn--inline btn--sm" onClick={() => setModal('partner')}>
              Novo parceiro
            </button>
          )}
        </div>
        <div className="grid-wrap">
          <table className="grid-table">
            <thead>
              <tr>
                <th>Nome</th>
                {MESES.map((m) => (
                  <th key={m}>{m}</th>
                ))}
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {partners.length === 0 ? (
                <tr>
                  <td colSpan={14} className="grid-empty">
                    Nenhum parceiro cadastrado para {year}.
                  </td>
                </tr>
              ) : (
                partners.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div className="grid-label-main">{p.partnerName}</div>
                      <div className="grid-label-meta">
                        {PARTNER_TYPE_LABEL[p.type]} · qtd. {p.quantity}
                      </div>
                    </td>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
                      const inst = p.installments.find((x) => x.month === month);
                      if (!inst) return <td key={month}>—</td>;
                      return (
                        <td key={month}>
                          <input
                            key={`amt-${inst.id}-${inst.amount}`}
                            type="number"
                            className="grid-cell-input"
                            defaultValue={inst.amount || ''}
                            disabled={!canManage}
                            onBlur={(ev) => handlePartnerAmount(p.id, inst.id, ev.target.value)}
                          />
                        </td>
                      );
                    })}
                    <td className="grid-row-total">{brl(total(p.installments))}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="fin-section">
        <h2 className="card-title">Totais</h2>
        <div className="grid-wrap">
          <table className="grid-table">
            <thead>
              <tr>
                <th>Indicador</th>
                {MESES.map((m) => (
                  <th key={m}>{m}</th>
                ))}
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              <tr className="grid-foot">
                <td>Receita</td>
                {monthlyTotals.map((m) => (
                  <td key={m.month}>{brl(m.receita)}</td>
                ))}
                <td>{brl(totalReceita)}</td>
              </tr>
              <tr className="grid-foot">
                <td>Despesa</td>
                {monthlyTotals.map((m) => (
                  <td key={m.month}>{brl(m.despesa)}</td>
                ))}
                <td>{brl(totalDespesa)}</td>
              </tr>
              <tr className="grid-foot">
                <td>Parceiros</td>
                {monthlyTotals.map((m) => (
                  <td key={m.month}>{brl(m.parceiros)}</td>
                ))}
                <td>{brl(totalParceiros)}</td>
              </tr>
              <tr className="grid-foot">
                <td>Lucro líquido</td>
                {monthlyTotals.map((m) => (
                  <td key={m.month}>{brl(m.lucroLiquido)}</td>
                ))}
                <td>{brl(totalLucro)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {modal === 'revenue' && (
        <RevenueModal year={year} clientes={clientes} onClose={() => setModal(null)} onCreated={onCreated} onError={(m) => showToast('error', m)} />
      )}
      {modal === 'expense' && (
        <ExpenseModal year={year} onClose={() => setModal(null)} onCreated={onCreated} onError={(m) => showToast('error', m)} />
      )}
      {modal === 'partner' && (
        <PartnerModal year={year} onClose={() => setModal(null)} onCreated={onCreated} onError={(m) => showToast('error', m)} />
      )}
    </>
  );
}

function RevenueModal({
  year,
  clientes,
  onClose,
  onCreated,
  onError,
}: {
  year: number;
  clientes: { id: string; name: string }[];
  onClose: () => void;
  onCreated: (m: string) => void;
  onError: (m: string) => void;
}) {
  const [clientId, setClientId] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<RevenueType>('recorrente');
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await createRevenue(year, {
      clientId: clientId || null,
      description: description || null,
      type,
      month: type === 'servico_unico' ? month : null,
    });
    setSaving(false);
    if (!res.ok) {
      onError(res.error);
      return;
    }
    onCreated('Receita criada.');
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>Nova receita</h2>
          <button className="modal-close" onClick={onClose} type="button"><CloseIcon /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="field-lt">
            <label htmlFor="clientId">Cliente</label>
            <select id="clientId" value={clientId} onChange={(e) => setClientId(e.target.value)}>
              <option value="">Nenhum (receita avulsa)</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field-lt">
            <label htmlFor="description">Descrição (se avulsa)</label>
            <input id="description" type="text" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
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

function ExpenseModal({
  year,
  onClose,
  onCreated,
  onError,
}: {
  year: number;
  onClose: () => void;
  onCreated: (m: string) => void;
  onError: (m: string) => void;
}) {
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('ferramenta');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await createExpense(year, { description, category });
    setSaving(false);
    if (!res.ok) {
      onError(res.error);
      return;
    }
    onCreated('Despesa criada.');
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>Nova despesa</h2>
          <button className="modal-close" onClick={onClose} type="button"><CloseIcon /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="field-lt">
            <label htmlFor="description">Descrição</label>
            <input
              id="description"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>
          <div className="field-lt">
            <label htmlFor="category">Categoria</label>
            <select id="category" value={category} onChange={(e) => setCategory(e.target.value as ExpenseCategory)}>
              <option value="ferramenta">Ferramenta</option>
              <option value="comunicacao">Comunicação</option>
              <option value="trafego">Tráfego</option>
              <option value="outros">Outros</option>
            </select>
          </div>
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

function PartnerModal({
  year,
  onClose,
  onCreated,
  onError,
}: {
  year: number;
  onClose: () => void;
  onCreated: (m: string) => void;
  onError: (m: string) => void;
}) {
  const [partnerName, setPartnerName] = useState('');
  const [type, setType] = useState<PartnerType>('mlx_cash');
  const [quantity, setQuantity] = useState(1);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await createPartnerPayment(year, { partnerName, type, quantity });
    setSaving(false);
    if (!res.ok) {
      onError(res.error);
      return;
    }
    onCreated('Parceiro criado.');
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>Novo parceiro</h2>
          <button className="modal-close" onClick={onClose} type="button"><CloseIcon /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="field-lt">
            <label htmlFor="partnerName">Nome</label>
            <input
              id="partnerName"
              type="text"
              value={partnerName}
              onChange={(e) => setPartnerName(e.target.value)}
              required
            />
          </div>
          <div className="field-row-lt">
            <div className="field-lt">
              <label htmlFor="type">Tipo</label>
              <select id="type" value={type} onChange={(e) => setType(e.target.value as PartnerType)}>
                <option value="mlx_cash">MLX Cash</option>
                <option value="mlx_recorrencia">MLX Recorrência</option>
              </select>
            </div>
            <div className="field-lt">
              <label htmlFor="quantity">Quantidade</label>
              <input
                id="quantity"
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value) || 1)}
              />
            </div>
          </div>
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
