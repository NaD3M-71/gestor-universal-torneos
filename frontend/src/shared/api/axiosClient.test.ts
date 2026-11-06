import { afterEach, describe, expect, it, vi } from 'vitest';

// El cliente lee VITE_API_URL al importarse, por eso cada test lo importa de
// nuevo (dynamic import) después de fijar la variable de entorno.
async function cargarCliente() {
  vi.resetModules();
  return import('./axiosClient');
}

describe('axiosClient', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('usa VITE_API_URL como URL base de la API', async () => {
    vi.stubEnv('VITE_API_URL', 'http://api.ejemplo.test/api');
    const { axiosClient } = await cargarCliente();
    expect(axiosClient.defaults.baseURL).toBe('http://api.ejemplo.test/api');
  });

  it('usa el backend local en el puerto 3000 si VITE_API_URL no está definida', async () => {
    vi.stubEnv('VITE_API_URL', '');
    const { axiosClient } = await cargarCliente();
    expect(axiosClient.defaults.baseURL).toBe('http://localhost:3000/api');
  });

  it('envía las cookies en cada petición', async () => {
    const { axiosClient } = await cargarCliente();
    expect(axiosClient.defaults.withCredentials).toBe(true);
  });
});
