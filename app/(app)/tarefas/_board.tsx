'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  STATUS_LABEL,
  PRIORITY_LABEL,
  PRIORITY_PILL,
  type TaskItem,
  type TaskStatus,
} from '@/lib/queries/tarefas';
import { dataCurta } from '@/lib/format';
import { updateTaskStatus } from './actions';
import TaskModal from './_task-modal';

const COLUNAS: TaskStatus[] = ['a_fazer', 'em_andamento', 'concluido'];

export default function Board({
  initialTasks,
  clientes,
  responsaveis,
  readOnly,
}: {
  initialTasks: TaskItem[];
  clientes: { id: string; name: string }[];
  responsaveis: { id: string; name: string }[];
  readOnly: boolean;
}) {
  const router = useRouter();
  const [tasks, setTasks] = useState(initialTasks);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<TaskStatus | null>(null);
  const [modal, setModal] = useState<{ mode: 'create' | 'edit'; task?: TaskItem } | null>(null);
  const [toast, setToast] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  function showToast(type: 'error' | 'success', text: string) {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3500);
  }

  async function onDrop(status: TaskStatus) {
    setDragOverCol(null);
    if (!dragId || readOnly) return;
    const taskId = dragId;
    setDragId(null);

    const anterior = tasks;
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status } : t)));

    const res = await updateTaskStatus(taskId, status);
    if (!res.ok) {
      setTasks(anterior);
      showToast('error', res.error);
    }
  }

  function onSaved(message: string) {
    setModal(null);
    showToast('success', message);
    router.refresh();
  }

  function onDeleted(message: string) {
    if (modal?.task) {
      setTasks((prev) => prev.filter((t) => t.id !== modal.task!.id));
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
            Nova tarefa
          </button>
        </div>
      )}

      <div className="kanban">
        {COLUNAS.map((status) => {
          const itens = tasks.filter((t) => t.status === status);
          return (
            <div
              key={status}
              className={`kanban-col${dragOverCol === status ? ' is-dragover' : ''}`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverCol(status);
              }}
              onDragLeave={() => setDragOverCol(null)}
              onDrop={() => onDrop(status)}
            >
              <div className="kanban-col-head">
                <span className="kanban-col-title">{STATUS_LABEL[status]}</span>
                <span className="kanban-col-count">{itens.length}</span>
              </div>

              {itens.length === 0 ? (
                <p className="kanban-empty">Nenhuma tarefa aqui.</p>
              ) : (
                itens.map((t) => {
                  const feitos = t.checklist.filter((c) => c.done).length;
                  return (
                    <div
                      key={t.id}
                      className={`kanban-card${dragId === t.id ? ' is-dragging' : ''}`}
                      draggable={!readOnly}
                      onDragStart={() => setDragId(t.id)}
                      onDragEnd={() => setDragId(null)}
                      onClick={() => setModal({ mode: 'edit', task: t })}
                    >
                      <div className="kanban-card-title">{t.title}</div>
                      <div className="kanban-card-meta">
                        <span className={`pill ${PRIORITY_PILL[t.priority]}`}>
                          {PRIORITY_LABEL[t.priority]}
                        </span>
                        {t.clientName && <span>{t.clientName}</span>}
                        {t.responsibleName && <span>· {t.responsibleName}</span>}
                        {t.dueDate && <span>· {dataCurta(t.dueDate)}</span>}
                        {t.checklist.length > 0 && (
                          <span>
                            · {feitos}/{t.checklist.length}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          );
        })}
      </div>

      {modal && (
        <TaskModal
          mode={modal.mode}
          task={modal.task}
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
