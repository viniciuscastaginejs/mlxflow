import type { SupabaseClient } from '@supabase/supabase-js';

export type TaskStatus = 'a_fazer' | 'em_andamento' | 'concluido';
export type TaskPriority = 'alta' | 'media' | 'baixa';

export const STATUS_LABEL: Record<TaskStatus, string> = {
  a_fazer: 'A fazer',
  em_andamento: 'Em andamento',
  concluido: 'Concluído',
};

export const PRIORITY_LABEL: Record<TaskPriority, string> = {
  alta: 'Alta',
  media: 'Média',
  baixa: 'Baixa',
};

export const PRIORITY_PILL: Record<TaskPriority, string> = {
  alta: 'pill--danger',
  media: 'pill--warn',
  baixa: 'pill--ok',
};

export type ChecklistItem = {
  id: string;
  label: string;
  done: boolean;
};

export type TaskItem = {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  clientId: string | null;
  clientName: string | null;
  responsibleId: string | null;
  responsibleName: string | null;
  checklist: ChecklistItem[];
};

export type TaskFilters = {
  responsibleId?: string;
  clientId?: string;
  scopedToUserId?: string;
};

export async function getTasks(
  supabase: SupabaseClient,
  filters: TaskFilters
): Promise<TaskItem[]> {
  // Sem embed (`profiles:assignee_id(...)`) de propósito: sem FK registrada no
  // Postgres pro PostgREST montar o relacionamento, então buscamos tudo separado
  // e juntamos em JS (igual já fazemos pro valor mensal em clientes).
  let query = supabase
    .from('tasks')
    .select('id, title, description, status, priority, due_date, client_id, assignee_id')
    .order('created_at', { ascending: true });

  if (filters.scopedToUserId) {
    query = query.eq('assignee_id', filters.scopedToUserId);
  } else if (filters.responsibleId) {
    query = query.eq('assignee_id', filters.responsibleId);
  }

  if (filters.clientId) {
    query = query.eq('client_id', filters.clientId);
  }

  const { data, error } = await query;
  if (error) throw error;

  const tasks = (data ?? []) as any[];
  const taskIds = tasks.map((t) => t.id);
  const responsibleIds = [...new Set(tasks.map((t) => t.assignee_id).filter(Boolean))];
  const clientIds = [...new Set(tasks.map((t) => t.client_id).filter(Boolean))];

  const fetchChecklist = async () => {
    let checklistByTask: Record<string, ChecklistItem[]> = {};
    if (taskIds.length === 0) return checklistByTask;

    const { data: items, error: itemsError } = await supabase
      .from('task_checklist_items')
      .select('id, task_id, label, done')
      .in('task_id', taskIds)
      .order('position', { ascending: true });
    if (itemsError) throw itemsError;

    checklistByTask = (items ?? []).reduce((acc: Record<string, ChecklistItem[]>, i: any) => {
      (acc[i.task_id] ??= []).push({ id: i.id, label: i.label, done: !!i.done });
      return acc;
    }, {});
    return checklistByTask;
  };

  const fetchResponsibleNames = async () => {
    let nameByResponsibleId: Record<string, string> = {};
    if (responsibleIds.length === 0) return nameByResponsibleId;

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', responsibleIds);
    nameByResponsibleId = (profiles ?? []).reduce((acc: Record<string, string>, p: any) => {
      acc[p.id] = p.full_name ?? '';
      return acc;
    }, {});
    return nameByResponsibleId;
  };

  const fetchClientNames = async () => {
    let nameByClientId: Record<string, string> = {};
    if (clientIds.length === 0) return nameByClientId;

    const { data: clients } = await supabase.from('clients').select('id, name').in('id', clientIds);
    nameByClientId = (clients ?? []).reduce((acc: Record<string, string>, c: any) => {
      acc[c.id] = c.name;
      return acc;
    }, {});
    return nameByClientId;
  };

  const [checklistByTask, nameByResponsibleId, nameByClientId] = await Promise.all([
    fetchChecklist(),
    fetchResponsibleNames(),
    fetchClientNames(),
  ]);

  return tasks.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description ?? null,
    status: t.status,
    priority: t.priority,
    dueDate: t.due_date ?? null,
    clientId: t.client_id ?? null,
    clientName: t.client_id ? nameByClientId[t.client_id] ?? null : null,
    responsibleId: t.assignee_id ?? null,
    responsibleName: t.assignee_id ? nameByResponsibleId[t.assignee_id] ?? null : null,
    checklist: checklistByTask[t.id] ?? [],
  }));
}
