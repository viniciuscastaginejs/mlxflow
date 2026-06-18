'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

export default function Notify() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [msg, setMsg] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  useEffect(() => {
    const error = searchParams.get('error');
    const success = searchParams.get('success');
    if (!error && !success) return;

    setMsg(error ? { type: 'error', text: error } : { type: 'success', text: success! });

    const timer = setTimeout(() => {
      setMsg(null);
      const params = new URLSearchParams(searchParams.toString());
      params.delete('error');
      params.delete('success');
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }, 4000);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  if (!msg) return null;

  return <div className={`toast toast--${msg.type}`}>{msg.text}</div>;
}
