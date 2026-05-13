import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/appParams';

export const base44 = createClient({
  appId: appParams.appId,
  token: appParams.token || undefined,
  serverUrl: appParams.appBaseUrl || undefined,
});

export default base44;
