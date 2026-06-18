// Componente estático (sem 'use client') — roda só no servidor, então o
// Math.random() não causa mismatch de hidratação: o cliente nunca re-executa
// esta função, só recebe o HTML já pronto.
export default function Particles({ count = 32 }: { count?: number }) {
  const particles = Array.from({ length: count }, (_, i) => {
    const left = Math.random() * 100;
    const size = 2 + Math.random() * 4;
    const duration = 10 + Math.random() * 14;
    const delay = Math.random() * -duration;
    const drift = (Math.random() - 0.5) * 120;
    const opacity = 0.35 + Math.random() * 0.5;

    return (
      <span
        key={i}
        className="particle"
        style={{
          left: `${left}%`,
          width: size,
          height: size,
          animationDuration: `${duration}s`,
          animationDelay: `${delay}s`,
          ['--drift' as string]: `${drift}px`,
          ['--peak' as string]: opacity,
        }}
      />
    );
  });

  return <div className="particles">{particles}</div>;
}
