'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { TargetIcon, UsersIcon, AuditIcon } from './_icons';

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: '◧' },
  { href: '/clientes', label: 'Clientes', icon: '◍' },
  { href: '/financeiro', label: 'Financeiro', icon: '₿', hideFor: ['colaborador'] },
  { href: '/calendario', label: 'Calendário', icon: '◰' },
  { href: '/pipeline', label: 'Pipeline', icon: '⇲' },
  { href: '/configuracoes/metas', label: 'Metas', icon: <TargetIcon />, hideFor: ['colaborador', 'visualizador'] },
  { href: '/configuracoes/usuarios', label: 'Usuários', icon: <UsersIcon />, hideFor: ['colaborador', 'visualizador', 'socio'] },
  { href: '/configuracoes/auditoria', label: 'Auditoria', icon: <AuditIcon />, hideFor: ['colaborador', 'visualizador'] },
];

export default function Nav({ role }: { role: string }) {
  const path = usePathname();
  const itens = NAV.filter((i) => !i.hideFor?.includes(role));
  return (
    <nav className="nav">
      {itens.map((i) => (
        <Link
          key={i.href}
          href={i.href}
          className={`nav-item${
            path === i.href || path.startsWith(i.href + '/') ? ' is-active' : ''
          }`}
        >
          <span className="nav-ic">{i.icon}</span>
          {i.label}
        </Link>
      ))}
    </nav>
  );
}
