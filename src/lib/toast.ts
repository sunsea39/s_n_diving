import { useEffect, useState } from 'react';

export function useToast(duration = 3500) {
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!message) return undefined;
    const timeout = window.setTimeout(() => setMessage(''), duration);
    return () => window.clearTimeout(timeout);
  }, [duration, message]);

  return { message, showToast: setMessage };
}
