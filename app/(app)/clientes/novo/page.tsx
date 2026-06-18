import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser, canManageClients } from '@/lib/auth/role';
import { getResponsaveis } from '@/lib/queries/clientes';
import { createCliente } from '../actions';
import Notify from '../../_notify';

export default async function NovoClientePage() {
  const supabase = await createClient();
  const me = await getCurrentUser();
  if (!canManageClients(me.role)) {
    redirect('/clientes');
  }

  const responsaveis = await getResponsaveis(supabase);

  return (
    <>
      <Notify />

      <h1 className="page-title">Novo cliente</h1>
      <p className="page-sub">Cadastrar um novo cliente</p>

      <div className="card">
        <form action={createCliente}>
          <div className="field-row-lt">
            <div className="field-lt">
              <label htmlFor="name">Empresa</label>
              <input id="name" name="name" type="text" required />
            </div>
            <div className="field-lt">
              <label htmlFor="nicho">Nicho</label>
              <input id="nicho" name="nicho" type="text" />
            </div>
          </div>

          <div className="field-row-lt">
            <div className="field-lt">
              <label htmlFor="contact_name">Contato</label>
              <input id="contact_name" name="contact_name" type="text" />
            </div>
            <div className="field-lt">
              <label htmlFor="contact_email">Email</label>
              <input id="contact_email" name="contact_email" type="email" />
            </div>
          </div>

          <div className="field-row-lt">
            <div className="field-lt">
              <label htmlFor="phone">Telefone</label>
              <input id="phone" name="phone" type="text" />
            </div>
            <div className="field-lt">
              <label htmlFor="whatsapp">WhatsApp</label>
              <input id="whatsapp" name="whatsapp" type="text" />
            </div>
          </div>

          <div className="field-row-lt">
            <div className="field-lt">
              <label htmlFor="instagram">Instagram</label>
              <input id="instagram" name="instagram" type="text" />
            </div>
            <div className="field-lt">
              <label htmlFor="status">Status</label>
              <select id="status" name="status" defaultValue="em_contratacao">
                <option value="em_contratacao">Em contratação</option>
                <option value="ativo">Ativo</option>
                <option value="suspenso">Suspenso</option>
                <option value="servico_unico">Serviço único</option>
                <option value="inativo">Inativo</option>
              </select>
            </div>
          </div>

          <div className="field-lt">
            <label htmlFor="responsible_id">Responsável</label>
            <select id="responsible_id" name="responsible_id" defaultValue="">
              <option value="">Sem responsável</option>
              {responsaveis.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          <button type="submit" className="btn">
            Criar cliente
          </button>
        </form>
      </div>
    </>
  );
}
