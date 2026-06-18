import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser, canSeeAuditoria } from '@/lib/auth/role';
import { getAuditLogs, getDistinctTables } from '@/lib/queries/auditoria';
import { getProfiles } from '@/lib/queries/usuarios';
import { dataCurta } from '@/lib/format';

export const dynamic = 'force-dynamic';

const ACAO_LABEL: Record<string, string> = {
  insert: 'criou',
  update: 'atualizou',
  delete: 'removeu',
};

export default async function AuditoriaPage({
  searchParams,
}: {
  searchParams: Promise<{ usuario?: string; tabela?: string }>;
}) {
  const supabase = await createClient();
  const me = await getCurrentUser();
  if (!canSeeAuditoria(me.role)) {
    redirect('/dashboard');
  }

  const { usuario, tabela } = await searchParams;

  const [logs, profiles, tabelas] = await Promise.all([
    getAuditLogs(supabase, { actorId: usuario, tableName: tabela }),
    getProfiles(supabase),
    getDistinctTables(supabase),
  ]);

  return (
    <>
      <h1 className="page-title">Auditoria</h1>
      <p className="page-sub">Histórico de ações no sistema</p>

      <form method="get" className="filters">
        <div className="field-lt">
          <label htmlFor="usuario">Usuário</label>
          <select id="usuario" name="usuario" defaultValue={usuario ?? ''}>
            <option value="">Todos</option>
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.fullName ?? p.email}
              </option>
            ))}
          </select>
        </div>
        <div className="field-lt">
          <label htmlFor="tabela">Tabela</label>
          <select id="tabela" name="tabela" defaultValue={tabela ?? ''}>
            <option value="">Todas</option>
            {tabelas.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn btn--inline btn--sm">
          Filtrar
        </button>
      </form>

      <div className="card">
        {logs.length === 0 ? (
          <p className="empty">Nenhum registro encontrado.</p>
        ) : (
          logs.map((l) => (
            <div className="act" key={l.id}>
              <span className="act-dot" />
              <div>
                <div className="act-text">
                  <b>{l.actorEmail ?? 'Alguém'}</b> {ACAO_LABEL[l.action] ?? l.action} um registro em{' '}
                  <b>{l.tableName}</b>
                </div>
                <div className="act-time">{dataCurta(l.createdAt)}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}
