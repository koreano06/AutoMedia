import { afterEach, describe, expect, it, vi } from 'vitest';
import { checkApiHealth } from './systemHealth';

describe('system health service', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('reports the API as online when health returns ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'ok', service: 'automedia-api' }),
    }));

    await expect(checkApiHealth()).resolves.toMatchObject({
      online: true,
      message: 'automedia-api online',
    });
  });

  it('reports an HTTP failure with the returned status code', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
    }));

    await expect(checkApiHealth()).resolves.toMatchObject({
      online: false,
      message: 'API respondeu com status 503.',
    });
  });

  it('reports connection failures without leaking technical noise to the UI', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')));

    await expect(checkApiHealth()).resolves.toMatchObject({
      online: false,
      message: 'Não foi possível conectar à API.',
    });
  });
});
