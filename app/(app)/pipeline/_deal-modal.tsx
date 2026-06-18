'use client';

import { useState } from 'react';
import type { Deal } from '@/lib/queries/pipeline';
import { dataCurta } from '@/lib/format';
import { createDeal, updateDeal, deleteDeal, addFollowup } from './actions';
import { CloseIcon, TrashIcon } from '../_icons';

export default function DealModal({
  mode,
  deal,
  clientes,
  responsaveis,
  onClose,
  onSaved,
  onDeleted,
  onError,
}: {
  mode: 'create' | 'edit';
  deal?: Deal;
  clientes: { id: string; name: string }[];
  responsaveis: { id: string; name: string }[];
  onClose: () => void;
  onSaved: (message: string) => void;
  onDeleted: (message: string) => void;
  onError: (message: string) => void;
}) {
  const [companyName, setCompanyName] = useState(deal?.companyName ?? '');
  const [contactName, setContactName] = useState(deal?.contactName ?? '');
  const [contactPhone, setContactPhone] = useState(deal?.contactPhone ?? '');
  const [estimatedValue, setEstimatedValue] = useState(deal?.estimatedValue ?? 0);
  const [responsibleId, setResponsibleId] = useState(deal?.responsibleId ?? '');
  const [clientId, setClientId] = useState(deal?.clientId ?? '');
  const [followups, setFollowups] = useState(deal?.followups ?? []);
  const [novoFollowup, setNovoFollowup] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const input = {
      companyName,
      contactName: contactName || null,
      contactPhone: contactPhone || null,
      estimatedValue,
      responsibleId: responsibleId || null,
      clientId: clientId || null,
    };

    const res = mode === 'create' ? await createDeal(input) : await updateDeal(deal!.id, input);

    setSaving(false);
    if (!res.ok) {
      onError(res.error);
      return;
    }
    onSaved(mode === 'create' ? 'Negócio criado.' : 'Negócio salvo.');
  }

  async function handleDelete() {
    if (!deal) return;
    if (!window.confirm('Excluir este negócio? Essa ação não pode ser desfeita.')) return;

    setDeleting(true);
    const res = await deleteDeal(deal.id);
    setDeleting(false);

    if (!res.ok) {
      onError(res.error);
      return;
    }
    onDeleted('Negócio excluído.');
  }

  async function handleAddFollowup() {
    if (!deal || !novoFollowup.trim()) return;
    const texto = novoFollowup.trim();
    setNovoFollowup('');
    const res = await addFollowup(deal.id, texto);
    if (!res.ok) {
      onError(res.error);
      return;
    }
    setFollowups((prev) => [
      { id: res.id!, authorName: null, content: texto, followUpDate: null, createdAt: new Date().toISOString() },
      ...prev,
    ]);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>{mode === 'create' ? 'Novo negócio' : 'Editar negócio'}</h2>
          <button className="modal-close" onClick={onClose} type="button"><CloseIcon /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="field-lt">
            <label htmlFor="companyName">Empresa</label>
            <input
              id="companyName"
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              required
            />
          </div>

          <div className="field-row-lt">
            <div className="field-lt">
              <label htmlFor="contactName">Contato</label>
              <input id="contactName" type="text" value={contactName} onChange={(e) => setContactName(e.target.value)} />
            </div>
            <div className="field-lt">
              <label htmlFor="contactPhone">Telefone</label>
              <input
                id="contactPhone"
                type="text"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
              />
            </div>
          </div>

          <div className="field-row-lt">
            <div className="field-lt">
              <label htmlFor="estimatedValue">Valor estimado</label>
              <input
                id="estimatedValue"
                type="number"
                step="0.01"
                min="0"
                value={estimatedValue}
                onChange={(e) => setEstimatedValue(Number(e.target.value) || 0)}
              />
            </div>
            <div className="field-lt">
              <label htmlFor="responsibleId">Responsável</label>
              <select id="responsibleId" value={responsibleId} onChange={(e) => setResponsibleId(e.target.value)}>
                <option value="">Sem responsável</option>
                {responsaveis.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="field-lt">
            <label htmlFor="clientId">Cliente vinculado</label>
            <select id="clientId" value={clientId} onChange={(e) => setClientId(e.target.value)}>
              <option value="">Nenhum (ainda é lead)</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {mode === 'edit' && (
            <div className="field-lt">
              <label>Follow-ups</label>
              {followups.length === 0 ? (
                <p className="empty">Nenhum follow-up ainda.</p>
              ) : (
                followups.map((f) => (
                  <div className="act" key={f.id}>
                    <span className="act-dot" />
                    <div>
                      <div className="act-text">
                        {f.authorName && <b>{f.authorName}: </b>}
                        {f.content}
                      </div>
                      <div className="act-time">{dataCurta(f.createdAt)}</div>
                    </div>
                  </div>
                ))
              )}
              <div className="checklist-editor-row" style={{ marginTop: 10 }}>
                <input
                  type="text"
                  placeholder="Novo follow-up"
                  value={novoFollowup}
                  onChange={(e) => setNovoFollowup(e.target.value)}
                />
                <button type="button" className="btn--secondary btn--sm" onClick={handleAddFollowup}>
                  Adicionar
                </button>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="submit" className="btn btn--inline" disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
              <button type="button" className="btn--secondary" onClick={onClose}>
                Cancelar
              </button>
            </div>
            {mode === 'edit' && (
              <button
                type="button"
                className="btn--icon-danger"
                onClick={handleDelete}
                disabled={deleting}
                title="Excluir negócio"
                aria-label="Excluir negócio"
              >
                <TrashIcon />
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
