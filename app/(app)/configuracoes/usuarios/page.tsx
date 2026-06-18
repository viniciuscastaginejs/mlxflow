import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser, canManageUsers, type Role } from '@/lib/auth/role';
import { getProfiles } from '@/lib/queries/usuarios';
import { dataCurta } from '@/lib/format';
import Notify from '../../_notify';
import { CloseIcon } from '../../_icons';
import { inviteTeamMember, updateUserRole, toggleUserActive } from './actions';

export const dynamic = 'force-dynamic';

const ROLE_LABEL: Record<Role, string> = {
  admin: 'Admin',
  socio: 'Sócio',
  colaborador: 'Colaborador',
  visualizador: 'Visualizador',
};

export default async function UsuariosPage({
  searchParams,
}: {
  searchParams: Promise<{ modal?: string }>;
}) {
  const supabase = await createClient();
  const me = await getCurrentUser(supabase);
  if (!canManageUsers(me.role)) {
    redirect('/dashboard');
  }

  const { modal } = await searchParams;
  const profiles = await getProfiles(supabase);

  return (
    <>
      <Notify />

      <div className="page-head">
        <div>
          <h1 className="page-title">Usuários</h1>
          <p className="page-sub">Membros da equipe e seus papéis</p>
        </div>
        <Link href="/configuracoes/usuarios?modal=novo" className="btn btn--inline">
          Convidar membro
        </Link>
      </div>

      <div className="card">
        {profiles.length === 0 ? (
          <p className="empty">Nenhum usuário ainda.</p>
        ) : (
          profiles.map((p) => (
            <div className="list-row" key={p.id}>
              <div>
                <div className="lr-main">{p.fullName ?? '(sem nome)'}</div>
                <div className="lr-sub">
                  {p.email} · desde {dataCurta(p.createdAt)}
                </div>
              </div>
              <div className="file-actions">
                <form
                  action={async (formData: FormData) => {
                    'use server';
                    await updateUserRole(p.id, formData.get('role') as Role, formData);
                  }}
                  style={{ display: 'flex', gap: 8 }}
                >
                  <select defaultValue={p.role} disabled={p.id === me.id} name="role">
                    {Object.entries(ROLE_LABEL).map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </select>
                  <button type="submit" className="btn--secondary btn--sm" disabled={p.id === me.id}>
                    Salvar
                  </button>
                </form>
                <form action={toggleUserActive.bind(null, p.id, !p.active)}>
                  <button
                    type="submit"
                    className={`toggle${p.active ? ' is-on' : ''}`}
                    aria-label="Ativo"
                    disabled={p.id === me.id}
                  />
                </form>
              </div>
            </div>
          ))
        )}
      </div>

      {modal === 'novo' && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-head">
              <h2>Convidar membro</h2>
              <Link href="/configuracoes/usuarios" className="modal-close">
                <CloseIcon />
              </Link>
            </div>
            <form action={inviteTeamMember}>
              <div className="field-lt">
                <label htmlFor="full_name">Nome</label>
                <input id="full_name" name="full_name" type="text" required />
              </div>
              <div className="field-lt">
                <label htmlFor="email">Email</label>
                <input id="email" name="email" type="email" required />
              </div>
              <div className="field-lt">
                <label htmlFor="role">Papel</label>
                <select id="role" name="role" defaultValue="visualizador">
                  {Object.entries(ROLE_LABEL).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
              <button type="submit" className="btn btn--inline">
                Enviar convite
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
