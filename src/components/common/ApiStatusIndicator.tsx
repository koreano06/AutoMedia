import { useEffect, useState } from 'react';
import { Activity, AlertTriangle, RefreshCw, Wifi } from 'lucide-react';
import { API_STATUS_EVENT } from '@/api/httpClient';
import { checkApiHealth } from '@/services/systemHealth';
import { cn } from '@/lib/utils';

type ApiStatus = 'checking' | 'online' | 'offline';

type ApiStatusEvent = CustomEvent<{
  online: boolean;
  detail?: string;
  checkedAt?: string;
}>;

export default function ApiStatusIndicator() {
  const [status, setStatus] = useState<ApiStatus>('checking');
  const [message, setMessage] = useState('Verificando API...');
  const [checking, setChecking] = useState(false);

  const runCheck = async () => {
    setChecking(true);
    const result = await checkApiHealth();
    setStatus(result.online ? 'online' : 'offline');
    setMessage(result.message);
    setChecking(false);
  };

  useEffect(() => {
    void runCheck();
    const interval = window.setInterval(() => void runCheck(), 60000);

    const handleApiStatus = (event: Event) => {
      const apiEvent = event as ApiStatusEvent;
      setStatus(apiEvent.detail.online ? 'online' : 'offline');
      setMessage(apiEvent.detail.detail || (apiEvent.detail.online ? 'API online' : 'API indisponível'));
    };

    window.addEventListener(API_STATUS_EVENT, handleApiStatus);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener(API_STATUS_EVENT, handleApiStatus);
    };
  }, []);

  const online = status === 'online';
  const offline = status === 'offline';
  const Icon = checking ? RefreshCw : online ? Wifi : offline ? AlertTriangle : Activity;

  return (
    <button
      type="button"
      onClick={() => void runCheck()}
      className={cn(
        'hidden h-9 items-center gap-2 rounded-2xl border px-3 text-xs font-medium transition-colors md:inline-flex',
        online && 'border-success/25 bg-success/10 text-success hover:bg-success/15',
        offline && 'border-destructive/25 bg-destructive/10 text-destructive hover:bg-destructive/15',
        status === 'checking' && 'border-border bg-muted/45 text-muted-foreground hover:bg-muted',
      )}
      title={message}
      aria-label={`Status da API: ${message}`}
    >
      <Icon className={cn('h-3.5 w-3.5', checking && 'animate-spin')} />
      <span>{online ? 'API online' : offline ? 'API offline' : 'API'}</span>
    </button>
  );
}
