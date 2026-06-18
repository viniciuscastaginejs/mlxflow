'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser, isReadOnly } from '@/lib/auth/role';
import type { TaskPriority, TaskStatus } from '@/lib/queries/tarefas';

type ActionResult = { ok: true } | { ok: false; error: string };

export type TaskInput = {
  title: string;
  description: string | null;
  clientId: string | null;
  responsibleId: string | null;
  dueDate: string | null;
  priority: TaskPriority;
  checklist: string[];
};

export async function createTask(input: TaskInput): Promise<ActionResult & { id?: string }> {
  const supabase = await createClient();
  const me = await getCurrentUser(supabase);
  if (isReadOnly(me.role)) return { ok: false, error: 'Sem permissão.' };
  if (!input.title.trim()) return { ok: false, error: 'Título é obrigatório.' };

  const { data: task, error } = await supabase
    .from('tasks')
    .insert({
      title: input.title.trim(),
      description: input.description || null,
      client_id: input.clientId || null,
      assignee_id: input.responsibleId || null,
      due_date: input.dueDate || null,
      priority: input.priority,
      status: 'a_fazer',
      created_by: me.id,
    })
    .select('id')
    .single();

  if (error || !task) return { ok: false, error: 'Erro ao criar tarefa.' };

  const itens = input.checklist.filter((l) => l.trim().length > 0);
  if (itens.length > 0) {
    await supabase.from('task_checklist_items').insert(
      itens.map((label, i) => ({ task_id: task.id, label: label.trim(), done: false, position: i }))
    );
  }

  revalidatePath('/tarefas');
  return { ok: true, id: task.id };
}

export async function updateTask(taskId: string, input: TaskInput): Promise<ActionResult> {
  const supabase = await createClient();
  const me = await getCurrentUser(supabase);
  if (isReadOnly(me.role)) return { ok: false, error: 'Sem permissão.' };
  if (!input.title.trim()) return { ok: false, error: 'Título é obrigatório.' };

  const { error } = await supabase
    .from('tasks')
    .update({
      title: input.title.trim(),
      description: input.description || null,
      client_id: input.clientId || null,
      assignee_id: input.responsibleId || null,
      due_date: input.dueDate || null,
      priority: input.priority,
    })
    .eq('id', taskId);

  if (error) return { ok: false, error: 'Erro ao salvar tarefa.' };

  revalidatePath('/tarefas');
  return { ok: true };
}

export async function deleteTask(taskId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const me = await getCurrentUser(supabase);
  if (isReadOnly(me.role)) return { ok: false, error: 'Sem permissão.' };

  await supabase.from('task_checklist_items').delete().eq('task_id', taskId);
  const { error } = await supabase.from('tasks').delete().eq('id', taskId);
  if (error) return { ok: false, error: 'Erro ao excluir tarefa.' };

  revalidatePath('/tarefas');
  return { ok: true };
}

export async function updateTaskStatus(
  taskId: string,
  status: TaskStatus
): Promise<ActionResult> {
  const supabase = await createClient();
  const me = await getCurrentUser(supabase);
  if (isReadOnly(me.role)) return { ok: false, error: 'Sem permissão.' };

  const { error } = await supabase.from('tasks').update({ status }).eq('id', taskId);
  if (error) return { ok: false, error: 'Erro ao mover tarefa.' };

  revalidatePath('/tarefas');
  return { ok: true };
}

export async function addChecklistItem(
  taskId: string,
  label: string
): Promise<ActionResult & { id?: string }> {
  const supabase = await createClient();
  const me = await getCurrentUser(supabase);
  if (isReadOnly(me.role)) return { ok: false, error: 'Sem permissão.' };
  if (!label.trim()) return { ok: false, error: 'Item vazio.' };

  const { count } = await supabase
    .from('task_checklist_items')
    .select('id', { count: 'exact', head: true })
    .eq('task_id', taskId);

  const { data, error } = await supabase
    .from('task_checklist_items')
    .insert({ task_id: taskId, label: label.trim(), done: false, position: count ?? 0 })
    .select('id')
    .single();

  if (error || !data) return { ok: false, error: 'Erro ao adicionar item.' };

  revalidatePath('/tarefas');
  return { ok: true, id: data.id };
}

export async function toggleChecklistItem(
  itemId: string,
  done: boolean
): Promise<ActionResult> {
  const supabase = await createClient();
  const me = await getCurrentUser(supabase);
  if (isReadOnly(me.role)) return { ok: false, error: 'Sem permissão.' };

  const { error } = await supabase
    .from('task_checklist_items')
    .update({ done })
    .eq('id', itemId);

  if (error) return { ok: false, error: 'Erro ao atualizar item.' };

  revalidatePath('/tarefas');
  return { ok: true };
}

export async function removeChecklistItem(itemId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const me = await getCurrentUser(supabase);
  if (isReadOnly(me.role)) return { ok: false, error: 'Sem permissão.' };

  const { error } = await supabase.from('task_checklist_items').delete().eq('id', itemId);
  if (error) return { ok: false, error: 'Erro ao remover item.' };

  revalidatePath('/tarefas');
  return { ok: true };
}
