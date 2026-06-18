import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getAllPosts, PLATFORM_LABEL, type Platform } from '@/lib/queries/editorial';
import { getClientesOptions } from '@/lib/queries/clientes';
import { DOW, addMonths, addDays, startOfWeek, buildMonthGrid, toISODate } from '@/lib/calendar-utils';
import { dataCurta } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function CalendarioPage({
  searchParams,
}: {
  searchParams: Promise<{ visao?: string; mes?: string; semana?: string; platform?: string; cliente?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();

  const visao: 'mensal' | 'semanal' = sp.visao === 'semanal' ? 'semanal' : 'mensal';
  const hojeISO = toISODate(new Date());
  const mes = sp.mes ?? hojeISO.slice(0, 7);
  const semana = sp.semana ?? hojeISO;
  const platformFilter = sp.platform as Platform | undefined;

  const [posts, clientes] = await Promise.all([
    getAllPosts(supabase, { platform: platformFilter, clientId: sp.cliente }),
    getClientesOptions(supabase),
  ]);

  const baseQS = (extra: Record<string, string>) => {
    const params = new URLSearchParams({ visao, mes, semana, ...extra });
    if (platformFilter) params.set('platform', platformFilter);
    if (sp.cliente) params.set('cliente', sp.cliente);
    return params.toString();
  };

  const postsByDate = posts.reduce((acc: Record<string, typeof posts>, p) => {
    (acc[p.scheduledDate] ??= []).push(p);
    return acc;
  }, {} as Record<string, typeof posts>);

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Calendário</h1>
          <p className="page-sub">Posts agendados de todos os clientes</p>
        </div>
      </div>

      <div className="cal-head">
        <div className="cal-nav">
          {visao === 'mensal' ? (
            <>
              <Link href={`/calendario?${baseQS({ mes: addMonths(mes, -1) })}`} className="cal-nav-btn">
                ‹
              </Link>
              <span className="cal-month-label">
                {new Date(mes + '-01T00:00:00').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
              </span>
              <Link href={`/calendario?${baseQS({ mes: addMonths(mes, 1) })}`} className="cal-nav-btn">
                ›
              </Link>
            </>
          ) : (
            <>
              <Link href={`/calendario?${baseQS({ semana: addDays(semana, -7) })}`} className="cal-nav-btn">
                ‹
              </Link>
              <span className="cal-month-label">
                {dataCurta(startOfWeek(semana))} – {dataCurta(addDays(startOfWeek(semana), 6))}
              </span>
              <Link href={`/calendario?${baseQS({ semana: addDays(semana, 7) })}`} className="cal-nav-btn">
                ›
              </Link>
            </>
          )}
        </div>

        <form method="get" className="filters" style={{ margin: 0 }}>
          <input type="hidden" name="visao" value={visao} />
          <input type="hidden" name="mes" value={mes} />
          <input type="hidden" name="semana" value={semana} />
          <div className="field-lt">
            <select name="cliente" defaultValue={sp.cliente ?? ''}>
              <option value="">Todos os clientes</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field-lt">
            <select name="platform" defaultValue={platformFilter ?? ''}>
              <option value="">Todas as plataformas</option>
              {Object.entries(PLATFORM_LABEL).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn--secondary btn--sm">
            Filtrar
          </button>
        </form>

        <div style={{ display: 'flex', gap: 8 }}>
          <Link
            href={`/calendario?${baseQS({ visao: 'mensal' })}`}
            className={`btn--secondary btn--sm${visao === 'mensal' ? ' is-active' : ''}`}
          >
            Mensal
          </Link>
          <Link
            href={`/calendario?${baseQS({ visao: 'semanal' })}`}
            className={`btn--secondary btn--sm${visao === 'semanal' ? ' is-active' : ''}`}
          >
            Semanal
          </Link>
        </div>
      </div>

      {visao === 'mensal' ? (
        <div className="cal-grid">
          {DOW.map((d) => (
            <div key={d} className="cal-dow">
              {d}
            </div>
          ))}
          {buildMonthGrid(mes).map((d) => (
            <div
              key={d.iso}
              className={`cal-day${d.outside ? ' is-outside' : ''}${d.iso === hojeISO ? ' is-today' : ''}`}
            >
              <div className="cal-day-num">{d.day}</div>
              {(postsByDate[d.iso] ?? []).map((p) => (
                <Link key={p.id} href={`/clientes/${p.clientId}?aba=calendario&editar=${p.id}`} className="post-chip">
                  <span className="post-chip-cap">{p.clientName ?? PLATFORM_LABEL[p.platform]}</span>
                </Link>
              ))}
            </div>
          ))}
        </div>
      ) : (
        <div className="cal-week">
          {Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(semana), i)).map((iso) => (
            <div key={iso} className={`cal-week-col${iso === hojeISO ? ' is-today' : ''}`}>
              <div className="cal-week-col-head">
                {DOW[new Date(iso + 'T00:00:00').getDay()]} {Number(iso.slice(8, 10))}
              </div>
              {(postsByDate[iso] ?? []).length === 0 ? (
                <p className="kanban-empty">—</p>
              ) : (
                postsByDate[iso].map((p) => (
                  <Link
                    key={p.id}
                    href={`/clientes/${p.clientId}?aba=calendario&editar=${p.id}`}
                    className="post-chip"
                    style={{ marginBottom: 6 }}
                  >
                    <span className="post-chip-cap">{p.clientName ?? '(sem cliente)'}</span>
                  </Link>
                ))
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
