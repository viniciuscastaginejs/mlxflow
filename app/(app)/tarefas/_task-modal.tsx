'use client';

import { useState } from 'react';
import type { TaskItem, TaskPriority } from '@/lib/queries/tarefas';
import {
  createTask,
  updateTask,
  deleteTask,
  addChecklistItem,
  toggleChecklistItem,
  removeChecklistItem,
} from './actions';
import { CloseIcon, TrashIcon, CheckIcon } from '../_icons';

export default function TaskModal({
  mode,
  task,
  clientes,
  responsaveis,
  onClose,
  onSaved,
  onDeleted,
  onError,
}: {
  mode: 'create' | 'edit';
  task?: TaskItem;
  clientes: { id: string; name: string }[];
  responsaveis: { id: string; name: string }[];
  onClose: () => void;
  onSaved: (message: string) => void;
  onDeleted: (message: string) => void;
  onError: (message: string) => void;
}) {
  const [title, setTitle] = useState(task?.title ?? '');
  const [description, setDescription] = useState(task?.description ?? '');
  const [clientId, setClientId] = useState(task?.clientId ?? '');
  const [responsibleId, setResponsibleId] = useState(task?.responsibleId ?? '');
  const [dueDate, setDueDate] = useState(task?.dueDate ?? '');
  const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? 'media');
  const [novosItens, setNovosItens] = useState<string[]>(mode === 'create' ? [''] : []);
  const [checklist, setChecklist] = useState(task?.checklist ?? []);
  const [novoItemTexto, setNovoItemTexto] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!task) return;
    if (!window.confirm('Excluir esta tarefa? Essa ação não pode ser desfeita.')) return;

    setDeleting(true);
    const res = await deleteTask(task.id);
    setDeleting(false);

    if (!res.ok) {
      onError(res.error);
      return;
    }
    onDeleted('Tarefa excluída.');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const input = {
      title,
      description: description || null,
      clientId: clientId || null,
      responsibleId: responsibleId || null,
      dueDate: dueDate || null,
      priority,
      checklist: novosItens,
    };

    const res =
      mode === 'create' ? await createTask(input) : await updateTask(task!.id, input);

    setSaving(false);
    if (!res.ok) {
      onError(res.error);
      return;
    }
    onSaved(mode === 'create' ? 'Tarefa criada.' : 'Tarefa salva.');
  }

  async function handleAddItem() {
    if (!task || !novoItemTexto.trim()) return;
    const texto = novoItemTexto.trim();
    setNovoItemTexto('');
    const res = await addChecklistItem(task.id, texto);
    if (!res.ok) {
      onError(res.error);
      return;
    }
    setChecklist((prev) => [...prev, { id: res.id!, label: texto, done: false }]);
  }

  async function handleToggleItem(itemId: string, done: boolean) {
    setChecklist((prev) => prev.map((c) => (c.id === itemId ? { ...c, done } : c)));
    const res = await toggleChecklistItem(itemId, done);
    if (!res.ok) {
      setChecklist((prev) => prev.map((c) => (c.id === itemId ? { ...c, done: !done } : c)));
      onError(res.error);
    }
  }

  async function handleRemoveItem(itemId: string) {
    const anterior = checklist;
    setChecklist((prev) => prev.filter((c) => c.id !== itemId));
    const res = await removeChecklistItem(itemId);
    if (!res.ok) {
      setChecklist(anterior);
      onError(res.error);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>{mode === 'create' ? 'Nova tarefa' : 'Editar tarefa'}</h2>
          <button className="modal-close" onClick={onClose} type="button">
            <CloseIcon />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="field-lt">
            <label htmlFor="title">Título</label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="field-lt">
            <label htmlFor="description">Descrição</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="field-row-lt">
            <div className="field-lt">
              <label htmlFor="clientId">Cliente</label>
              <select id="clientId" value={clientId} onChange={(e) => setClientId(e.target.value)}>
                <option value="">Nenhum</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field-lt">
              <label htmlFor="responsibleId">Responsável</label>
              <select
                id="responsibleId"
                value={responsibleId}
                onChange={(e) => setResponsibleId(e.target.value)}
              >
                <option value="">Sem responsável</option>
                {responsaveis.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="field-row-lt">
            <div className="field-lt">
              <label htmlFor="dueDate">Prazo</label>
              <input
                id="dueDate"
                type="date"
                value={dueDate ?? ''}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
            <div className="field-lt">
              <label htmlFor="priority">Prioridade</label>
              <select
                id="priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
              >
                <option value="alta">Alta</option>
                <option value="media">Média</option>
                <option value="baixa">Baixa</option>
              </select>
            </div>
          </div>

          <div className="field-lt">
            <label>Checklist</label>

            {mode === 'create' ? (
              <>
                {novosItens.map((item, i) => (
                  <div className="checklist-editor-row" key={i}>
                    <input
                      type="text"
                      value={item}
                      placeholder="Subitem"
                      onChange={(e) =>
                        setNovosItens((prev) =>
                          prev.map((v, idx) => (idx === i ? e.target.value : v))
                        )
                      }
                    />
                    <button
                      type="button"
                      className="checklist-editor-remove"
                      onClick={() => setNovosItens((prev) => prev.filter((_, idx) => idx !== i))}
                    >
                      <CloseIcon size={13} />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="btn--secondary btn--sm"
                  onClick={() => setNovosItens((prev) => [...prev, ''])}
                >
                  + Adicionar subitem
                </button>
              </>
            ) : (
              <>
                {checklist.map((c) => (
                  <div className="checklist-row" key={c.id}>
                    <button
                      type="button"
                      className={`checklist-check${c.done ? ' is-done' : ''}`}
                      onClick={() => handleToggleItem(c.id, !c.done)}
                    >
                      {c.done ? <CheckIcon /> : ''}
                    </button>
                    <span className="checklist-label" style={{ flex: 1 }}>
                      {c.label}
                    </span>
                    <button
                      type="button"
                      className="checklist-editor-remove"
                      onClick={() => handleRemoveItem(c.id)}
                    >
                      <CloseIcon size={13} />
                    </button>
                  </div>
                ))}
                <div className="checklist-editor-row">
                  <input
                    type="text"
                    placeholder="Novo subitem"
                    value={novoItemTexto}
                    onChange={(e) => setNovoItemTexto(e.target.value)}
                  />
                  <button type="button" className="btn--secondary btn--sm" onClick={handleAddItem}>
                    Adicionar
                  </button>
                </div>
              </>
            )}
          </div>

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
                title="Excluir tarefa"
                aria-label="Excluir tarefa"
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
