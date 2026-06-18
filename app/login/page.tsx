import Image from 'next/image';
import { login } from './actions';
import Particles from './_particles';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="auth">
      <div className="aurora aurora-1" />
      <div className="aurora aurora-2" />
      <div className="aurora aurora-3" />
      <Particles />

      <div className="auth-card">
        <div className="logo">
          <Image src="/logo-mark.png" alt="MLX" width={64} height={61} className="logo-mark-img" priority />
          <div className="logo-word">
            MLX <b>FLOW</b>
          </div>
        </div>

        <div className="auth-card-head">
          <h2>Entrar</h2>
          <p>Acesse o painel interno da MLX Mind</p>
        </div>

        {error && <div className="alert">{error}</div>}

        <form action={login}>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="voce@mlxmind.com"
              required
            />
          </div>
          <div className="field">
            <label htmlFor="password">Senha</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              required
            />
          </div>
          <button className="btn" type="submit">
            Entrar
          </button>
        </form>
      </div>
    </div>
  );
}
