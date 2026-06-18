import { createClient } from '@/lib/supabase/server';
import { getCurrentUser, isReadOnly } from '@/lib/auth/role';
import { getTasks } from '@/lib/queries/tarefas';
import { getClientesOptions, getResponsaveis } from '@/lib/queries/clientes';
import Board from './_board';

export const dynamic = 'force-dynamic';

export default async function TarefasPage({
  searchParams,
}: {
  searchParams: Promise<{ responsavel?: string; cliente?: string }>;
}) {
  const { responsavel, cliente } = await searchParams;
  const supabase = await createClient();
  const me = await getCurrentUser();
  const isColaborador = me.role === 'colaborador';

  const [tasks, clientes, responsaveis] = await Promise.all([
    getTasks(supabase, {
      responsibleId: isColaborador ? undefined : responsavel,
      clientId: cliente,
      scopedToUserId: isColaborador ? me.id : undefined,
    }),
    getClientesOptions(supabase),
    getResponsaveis(supabase),
  ]);

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Tarefas</h1>
          <p className="page-sub">Kanban da equipe</p>
        </div>
      </div>

      <form method="get" className="filters">
        <div className="field-lt">
          <label htmlFor="cliente">Cliente</label>
          <select id="cliente" name="cliente" defaultValue={cliente ?? ''}>
            <option value="">Todos</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {!isColaborador && (
          <div className="field-lt">
            <label htmlFor="responsavel">Responsável</label>
            <select id="responsavel" name="responsavel" defaultValue={responsavel ?? ''}>
              <option value="">Todos</option>
              {responsaveis.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <button type="submit" className="btn btn--inline btn--sm">
          Filtrar
        </button>
      </form>

      <Board
        initialTasks={tasks}
        clientes={clientes}
        responsaveis={responsaveis}
        readOnly={isReadOnly(me.role)}
      />
    </>
  );
}
