import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser, canManageClients } from '@/lib/auth/role';
import {
  getClientesList,
  getResponsaveis,
  STATUS_LABEL,
  STATUS_PILL,
  type ClientStatus,
} from '@/lib/queries/clientes';
import { brl } from '@/lib/format';
import Notify from '../_notify';

export const dynamic = 'force-dynamic';

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    responsavel?: string;
    inativos?: string;
  }>;
}) {
  const { status, responsavel, inativos } = await searchParams;
  const supabase = await createClient();
  const me = await getCurrentUser(supabase);
  const isColaborador = me.role === 'colaborador';

  const [clientes, responsaveis] = await Promise.all([
    getClientesList(supabase, {
      status: status as ClientStatus | undefined,
      responsibleId: isColaborador ? undefined : responsavel,
      showInactive: inativos === '1',
      scopedToUserId: isColaborador ? me.id : undefined,
    }),
    getResponsaveis(supabase),
  ]);

  return (
    <>
      <Notify />

      <div className="page-head">
        <div>
          <h1 className="page-title">Clientes</h1>
          <p className="page-sub">Base de clientes da agência</p>
        </div>
        {canManageClients(me.role) && (
          <Link href="/clientes/novo" className="btn btn--inline">
            Novo cliente
          </Link>
        )}
      </div>

      <form method="get" className="filters">
        <div className="field-lt">
          <label htmlFor="status">Status</label>
          <select id="status" name="status" defaultValue={status ?? ''}>
            <option value="">Todos</option>
            {Object.entries(STATUS_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
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

        <label className="check">
          <input type="checkbox" name="inativos" value="1" defaultChecked={inativos === '1'} />
          Mostrar inativos
        </label>

        <button type="submit" className="btn btn--inline btn--sm">
          Filtrar
        </button>
      </form>

      <div className="card">
        {clientes.length === 0 ? (
          <p className="empty">
            Nenhum cliente ainda.{' '}
            {canManageClients(me.role) && (
              <Link href="/clientes/novo" className="file-link">
                Adicionar o primeiro
              </Link>
            )}
          </p>
        ) : (
          clientes.map((c) => (
            <Link href={`/clientes/${c.id}`} key={c.id} className="list-row">
              <div>
                <div className="lr-main">{c.name}</div>
                <div className="lr-sub">
                  {c.nicho ?? 'Sem nicho'} · {c.responsibleName ?? 'Sem responsável'}
                </div>
              </div>
              <div className="lr-right">
                <div className="lr-main">{brl(c.valorMensalTotal)}</div>
                <span className={`pill ${STATUS_PILL[c.status]}`}>{STATUS_LABEL[c.status]}</span>
              </div>
            </Link>
          ))
        )}
      </div>
    </>
  );
}
