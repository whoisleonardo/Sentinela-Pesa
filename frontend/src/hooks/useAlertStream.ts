import { useEffect, useRef, useState } from 'react';
import type { Alert } from '../api/client';

/**
 * Conecta ao endpoint SSE /api/alerts/stream. Cada evento é um alerta
 * publicado pelo worker no canal Redis sentinela:alerts em tempo real.
 */
export function useAlertStream(onAlert?: (alert: Alert) => void) {
  const [liveAlerts, setLiveAlerts] = useState<Alert[]>([]);
  const [connected, setConnected] = useState(false);
  const callbackRef = useRef(onAlert);
  callbackRef.current = onAlert;

  useEffect(() => {
    const source = new EventSource('/api/alerts/stream');

    source.onopen = () => setConnected(true);
    source.onerror = () => setConnected(false);
    source.onmessage = (evt) => {
      try {
        const alert: Alert = JSON.parse(evt.data);
        setLiveAlerts((prev) => [alert, ...prev].slice(0, 30));
        callbackRef.current?.(alert);
      } catch {
        // ignora mensagens não-JSON (ex.: heartbeat ':')
      }
    };

    return () => source.close();
  }, []);

  return { liveAlerts, connected };
}
