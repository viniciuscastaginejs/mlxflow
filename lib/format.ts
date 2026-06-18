// Formatação em pt-BR
export const brl = (n: number | null | undefined) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
    Number(n) || 0
  );

export const num = (n: number | null | undefined) =>
  new Intl.NumberFormat('pt-BR').format(Number(n) || 0);

export const pct = (n: number) =>
  `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(n)}%`;

export const dataCurta = (d: string | Date) =>
  new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(
    new Date(d)
  );
