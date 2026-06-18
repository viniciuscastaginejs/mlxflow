import { createServiceClient } from '@/lib/supabase/service';
import { getPostByToken, PLATFORM_LABEL } from '@/lib/queries/editorial';
import { dataCurta } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function AprovarPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = createServiceClient();
  const post = await getPostByToken(supabase, token);

  if (!post) {
    return (
      <div className="auth">
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <h2>Link inválido</h2>
          <p style={{ color: '#a79fc0' }}>Esse link de aprovação não existe ou expirou.</p>
        </div>
      </div>
    );
  }

  let artUrl: string | null = null;
  if (post.artPath) {
    const { data } = await supabase.storage.from('post-art').createSignedUrl(post.artPath, 3600);
    artUrl = data?.signedUrl ?? null;
  }

  let clientName = '';
  const { data: client } = await supabase.from('clients').select('name').eq('id', post.clientId).maybeSingle();
  clientName = client?.name ?? '';

  const jaRespondeu = !!post.approvedAt;

  return (
    <div className="auth">
      <div className="aurora aurora-1" />
      <div className="aurora aurora-2" />
      <div className="aurora aurora-3" />

      <div className="auth-card" style={{ maxWidth: 460 }}>
        <div className="auth-card-head">
          <h2>{clientName || 'Aprovação de post'}</h2>
          <p>
            {PLATFORM_LABEL[post.platform]} · {dataCurta(post.scheduledDate)}
          </p>
        </div>

        {artUrl && (
          <img
            src={artUrl}
            alt="Arte do post"
            style={{ width: '100%', borderRadius: 14, marginBottom: 18, maxHeight: 320, objectFit: 'cover' }}
          />
        )}

        {post.caption && (
          <p style={{ color: '#cfc8e0', fontSize: 14, marginBottom: 20, whiteSpace: 'pre-wrap' }}>{post.caption}</p>
        )}

        {jaRespondeu ? (
          <div className="alert">
            Você já respondeu este post em {dataCurta(post.approvedAt!)}
            {post.status === 'aprovado' ? ' — Aprovado.' : ''}
            {post.approvalNote ? ` Comentário: "${post.approvalNote}"` : ''}
          </div>
        ) : (
          <form action={`/api/aprovar/${token}`} method="post">
            <button type="submit" name="action" value="aprovar" className="btn" style={{ marginBottom: 14 }}>
              Aprovar
            </button>
            <div className="field">
              <label htmlFor="note">Comentário (se for reprovar)</label>
              <textarea id="note" name="note" rows={3} />
            </div>
            <button
              type="submit"
              name="action"
              value="reprovar"
              className="btn"
              style={{ background: 'transparent', border: '1px solid rgba(255,255,255,.2)', boxShadow: 'none' }}
            >
              Reprovar com comentário
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
