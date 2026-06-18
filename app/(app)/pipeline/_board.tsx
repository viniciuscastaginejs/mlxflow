'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { STAGE_LABEL, type Deal, type PipelineStage } from '@/lib/queries/pipeline';
import { brl } from '@/lib/format';
import { updateDealStage } from './actions';
import DealModal from './_deal-modal';

const COLUNAS: PipelineStage[] = ['lead', 'reuniao_agendada', 'proposta_enviada', 'fechado', 'perdido'];

export default function Board({
  initialDeals,
  clientes,
  responsaveis,
  readOnly,
}: {
  initialDeals: Deal[];
  clientes: { id: string; name: string }[];
  responsaveis: { id: string; name: string }[];
  readOnly: boolean;
}) {
  const router = useRouter();
  const [deals, setDeals] = useState(initialDeals);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<PipelineStage | null>(null);
  const [modal, setModal] = useState<{ mode: 'create' | 'edit'; deal?: Deal } | null>(null);
  const [toast, setToast] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  function showToast(type: 'error' | 'success', text: string) {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3500);
  }

  async function onDrop(stage: PipelineStage) {
    setDragOverCol(null);
    if (!dragId || readOnly) return;
    const dealId = dragId;
    setDragId(null);

    let lossReason: string | undefined;
    if (stage === 'perdido') {
      const motivo = window.prompt('Motivo da perda:');
      if (motivo === null) return; // cancelou
      lossReason = motivo;
    }

    const anterior = deals;
    setDeals((prev) =>
      prev.map((d) => (d.id === dealId ? { ...d, stage, lossReason: lossReason ?? d.lossReason } : d))
    );

    const res = await updateDealStage(dealId, stage, lossReason);
    if (!res.ok) {
      setDeals(anterior);
      showToast('error', res.error);
    } else {
      router.refresh();
    }
  }

  function onSaved(message: string) {
    setModal(null);
    showToast('success', message);
    router.refresh();
  }

  function onDeleted(message: string) {
    if (modal?.deal) {
      setDeals((prev) => prev.filter((d) => d.id !== modal.deal!.id));
    }
    setModal(null);
    showToast('success', message);
    router.refresh();
  }

  return (
    <>
      {toast && <div className={`toast toast--${toast.type}`}>{toast.text}</div>}

      {!readOnly && (
        <div className="page-head">
          <div />
          <button className="btn btn--inline" onClick={() => setModal({ mode: 'create' })}>
            Novo negócio
          </button>
        </div>
      )}

      <div className="kanban is-5col">
        {COLUNAS.map((stage) => {
          const itens = deals.filter((d) => d.stage === stage);
          return (
            <div
              key={stage}
              className={`kanban-col${dragOverCol === stage ? ' is-dragover' : ''}`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverCol(stage);
              }}
              onDragLeave={() => setDragOverCol(null)}
              onDrop={() => onDrop(stage)}
            >
              <div className="kanban-col-head">
                <span className="kanban-col-title">{STAGE_LABEL[stage]}</span>
                <span className="kanban-col-count">{itens.length}</span>
              </div>

              {itens.length === 0 ? (
                <p className="kanban-empty">Nenhum negócio aqui.</p>
              ) : (
                itens.map((d) => (
                  <div
                    key={d.id}
                    className={`kanban-card${dragId === d.id ? ' is-dragging' : ''}`}
                    draggable={!readOnly}
                    onDragStart={() => setDragId(d.id)}
                    onDragEnd={() => setDragId(null)}
                    onClick={() => setModal({ mode: 'edit', deal: d })}
                  >
                    <div className="kanban-card-title">{d.companyName}</div>
                    <div className="kanban-card-meta">
                      <span>{brl(d.estimatedValue)}</span>
                      {d.contactName && <span>· {d.contactName}</span>}
                      {d.responsibleName && <span>· {d.responsibleName}</span>}
                    </div>
                  </div>
                ))
              )}
            </div>
          );
        })}
      </div>

      {modal && (
        <DealModal
          mode={modal.mode}
          deal={modal.deal}
          clientes={clientes}
          responsaveis={responsaveis}
          onClose={() => setModal(null)}
          onSaved={onSaved}
          onDeleted={onDeleted}
          onError={(msg) => showToast('error', msg)}
        />
      )}
    </>
  );
}
