import Link from 'next/link';
import {
  PLATFORM_LABEL,
  STATUS_LABEL,
  STATUS_PILL,
  type EditorialPost,
  type Platform,
} from '@/lib/queries/editorial';
import { dataCurta } from '@/lib/format';
import { createPost, updatePost, deletePost } from './editorial-actions';
import { CloseIcon, TrashIcon } from '../_icons';
import { DOW, addMonths, addDays, startOfWeek, buildMonthGrid, toISODate } from '@/lib/calendar-utils';

type PostComUrl = EditorialPost & { url: string | null };

export default function CalendarioTab({
  clientId,
  posts,
  platformFilter,
  visao,
  mes,
  semana,
  modal,
  editId,
  readOnly,
  origin,
}: {
  clientId: string;
  posts: PostComUrl[];
  platformFilter?: Platform;
  visao: 'mensal' | 'semanal';
  mes: string;
  semana: string;
  modal: 'novo' | null;
  editId: string | null;
  readOnly: boolean;
  origin: string;
}) {
  const baseQS = (extra: Record<string, string>) => {
    const params = new URLSearchParams({ aba: 'calendario', visao, mes, semana, ...extra });
    if (platformFilter) params.set('platform', platformFilter);
    return params.toString();
  };

  const postsByDate = posts.reduce((acc: Record<string, PostComUrl[]>, p) => {
    (acc[p.scheduledDate] ??= []).push(p);
    return acc;
  }, {});

  const hoje = toISODate(new Date());
  const editPost = editId ? posts.find((p) => p.id === editId) ?? null : null;

  return (
    <div className="stack">
      <div className="cal-head">
        <div className="cal-nav">
          {visao === 'mensal' ? (
            <>
              <Link href={`/clientes/${clientId}?${baseQS({ mes: addMonths(mes, -1) })}`} className="cal-nav-btn">
                ‹
              </Link>
              <span className="cal-month-label">
                {new Date(mes + '-01T00:00:00').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
              </span>
              <Link href={`/clientes/${clientId}?${baseQS({ mes: addMonths(mes, 1) })}`} className="cal-nav-btn">
                ›
              </Link>
            </>
          ) : (
            <>
              <Link href={`/clientes/${clientId}?${baseQS({ semana: addDays(semana, -7) })}`} className="cal-nav-btn">
                ‹
              </Link>
              <span className="cal-month-label">
                {dataCurta(startOfWeek(semana))} – {dataCurta(addDays(startOfWeek(semana), 6))}
              </span>
              <Link href={`/clientes/${clientId}?${baseQS({ semana: addDays(semana, 7) })}`} className="cal-nav-btn">
                ›
              </Link>
            </>
          )}
        </div>

        <form method="get" className="filters" style={{ margin: 0 }}>
          <input type="hidden" name="aba" value="calendario" />
          <input type="hidden" name="visao" value={visao} />
          <input type="hidden" name="mes" value={mes} />
          <input type="hidden" name="semana" value={semana} />
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
            href={`/clientes/${clientId}?${baseQS({ visao: 'mensal' })}`}
            className={`btn--secondary btn--sm${visao === 'mensal' ? ' is-active' : ''}`}
          >
            Mensal
          </Link>
          <Link
            href={`/clientes/${clientId}?${baseQS({ visao: 'semanal' })}`}
            className={`btn--secondary btn--sm${visao === 'semanal' ? ' is-active' : ''}`}
          >
            Semanal
          </Link>
          {!readOnly && (
            <Link href={`/clientes/${clientId}?${baseQS({ modal: 'novo' })}`} className="btn btn--inline btn--sm">
              Novo post
            </Link>
          )}
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
            <div key={d.iso} className={`cal-day${d.outside ? ' is-outside' : ''}${d.iso === hoje ? ' is-today' : ''}`}>
              <div className="cal-day-num">{d.day}</div>
              {(postsByDate[d.iso] ?? []).map((p) => (
                <Link
                  key={p.id}
                  href={`/clientes/${clientId}?${baseQS({ editar: p.id })}`}
                  className="post-chip"
                >
                  <span className="post-chip-cap">{p.caption ?? PLATFORM_LABEL[p.platform]}</span>
                </Link>
              ))}
            </div>
          ))}
        </div>
      ) : (
        <div className="cal-week">
          {Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(semana), i)).map((iso) => (
            <div key={iso} className={`cal-week-col${iso === hoje ? ' is-today' : ''}`}>
              <div className="cal-week-col-head">
                {DOW[new Date(iso + 'T00:00:00').getDay()]} {Number(iso.slice(8, 10))}
              </div>
              {(postsByDate[iso] ?? []).length === 0 ? (
                <p className="kanban-empty">—</p>
              ) : (
                postsByDate[iso].map((p) => (
                  <Link key={p.id} href={`/clientes/${clientId}?${baseQS({ editar: p.id })}`} className="post-chip" style={{ marginBottom: 6 }}>
                    <span className="post-chip-cap">{p.caption ?? '(sem legenda)'}</span>
                    <span className={`pill ${STATUS_PILL[p.status]}`} style={{ marginTop: 4 }}>
                      {STATUS_LABEL[p.status]}
                    </span>
                  </Link>
                ))
              )}
            </div>
          ))}
        </div>
      )}

      {modal === 'novo' && !readOnly && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-head">
              <h2>Novo post</h2>
              <Link href={`/clientes/${clientId}?${baseQS({})}`} className="modal-close">
                <CloseIcon />
              </Link>
            </div>
            <form action={createPost.bind(null, clientId)}>
              <div className="field-row-lt">
                <div className="field-lt">
                  <label htmlFor="scheduled_date">Data</label>
                  <input id="scheduled_date" name="scheduled_date" type="date" required />
                </div>
                <div className="field-lt">
                  <label htmlFor="platform">Plataforma</label>
                  <select id="platform" name="platform" defaultValue="instagram">
                    {Object.entries(PLATFORM_LABEL).map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="field-lt">
                <label htmlFor="caption">Legenda</label>
                <textarea id="caption" name="caption" />
              </div>
              <div className="field-lt">
                <label htmlFor="file">Arte</label>
                <input id="file" name="file" type="file" accept="image/*" />
              </div>
              <button type="submit" className="btn btn--inline">
                Agendar
              </button>
            </form>
          </div>
        </div>
      )}

      {editPost && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-head">
              <h2>Post de {dataCurta(editPost.scheduledDate)}</h2>
              <Link href={`/clientes/${clientId}?${baseQS({})}`} className="modal-close">
                <CloseIcon />
              </Link>
            </div>

            {editPost.url && (
              <img
                src={editPost.url}
                alt="Arte do post"
                style={{ width: '100%', borderRadius: 11, marginBottom: 16, maxHeight: 220, objectFit: 'cover' }}
              />
            )}

            {readOnly ? (
              <div className="stack">
                <div className="list-row">
                  <div className="lr-main">Plataforma</div>
                  <div className="lr-sub">{PLATFORM_LABEL[editPost.platform]}</div>
                </div>
                <div className="list-row">
                  <div className="lr-main">Status</div>
                  <span className={`pill ${STATUS_PILL[editPost.status]}`}>{STATUS_LABEL[editPost.status]}</span>
                </div>
                <div className="list-row">
                  <div className="lr-main">Legenda</div>
                  <div className="lr-sub">{editPost.caption ?? '—'}</div>
                </div>
              </div>
            ) : (
              <form action={updatePost.bind(null, clientId, editPost.id)}>
                <div className="field-row-lt">
                  <div className="field-lt">
                    <label htmlFor="scheduled_date">Data</label>
                    <input
                      id="scheduled_date"
                      name="scheduled_date"
                      type="date"
                      defaultValue={editPost.scheduledDate}
                      required
                    />
                  </div>
                  <div className="field-lt">
                    <label htmlFor="platform">Plataforma</label>
                    <select id="platform" name="platform" defaultValue={editPost.platform}>
                      {Object.entries(PLATFORM_LABEL).map(([v, l]) => (
                        <option key={v} value={v}>
                          {l}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="field-lt">
                  <label htmlFor="caption">Legenda</label>
                  <textarea id="caption" name="caption" defaultValue={editPost.caption ?? ''} />
                </div>
                <div className="field-lt">
                  <label htmlFor="status">Status</label>
                  <select id="status" name="status" defaultValue={editPost.status}>
                    {Object.entries(STATUS_LABEL).map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field-lt">
                  <label htmlFor="file">Trocar arte</label>
                  <input id="file" name="file" type="file" accept="image/*" />
                </div>

                <div className="field-lt">
                  <label>Link de aprovação (enviar pro cliente)</label>
                  <input type="text" readOnly value={`${origin}/aprovar/${editPost.approvalToken}`} />
                </div>

                {editPost.approvedAt && (
                  <p className="grid-label-meta">
                    Respondido em {dataCurta(editPost.approvedAt)}
                    {editPost.approvalNote ? `: "${editPost.approvalNote}"` : ''}
                  </p>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                  <button type="submit" className="btn btn--inline">
                    Salvar
                  </button>
                  <button
                    type="submit"
                    formAction={deletePost.bind(null, clientId, editPost.id)}
                    className="btn--icon-danger"
                    title="Excluir post"
                  >
                    <TrashIcon />
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
