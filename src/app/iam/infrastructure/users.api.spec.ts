import { TestBed } from '@angular/core/testing';
import { IamApi } from './iam.api';
import { UsersApi } from './users.api';

describe('UsersApi', () => {
  afterEach(() => vi.unstubAllGlobals());

  function api(): UsersApi {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [{ provide: IamApi, useValue: { accessToken: () => 'tok' } }] });
    return TestBed.inject(UsersApi);
  }

  it('lists users and changes one role at a time with the session token', async () => {
    const user = { id: 'u 1', email: 'a@b.c', fullName: 'A', status: 'ACTIVE', roles: ['TECH'] };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ content: [user] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(user), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ...user, roles: [] }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const users = api();

    expect(await users.listUsers()).toEqual([user]);
    await users.assignRole('u 1', 'TECH');
    expect((await users.withdrawRole('u 1', 'TECH')).roles).toEqual([]);
    expect(String(fetchMock.mock.calls[1]![0])).toBe('/api/v1/users/u%201/roles/TECH');
    expect(fetchMock.mock.calls[1]![1].method).toBe('PUT');
    expect(fetchMock.mock.calls[2]![1].method).toBe('DELETE');
    expect((fetchMock.mock.calls[0]![1].headers as Headers).get('Authorization')).toBe('Bearer tok');
  });

  it('explains denied operations and incompatible roles', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(new Response('', { status: 403 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ detail: 'TECH y SUBSCRIPTION_MANAGER son incompatibles' }), { status: 409, headers: { 'content-type': 'application/problem+json' } }))
      .mockRejectedValueOnce(new TypeError('offline')));
    const users = api();
    await expect(users.assignRole('u1', 'ADMIN')).rejects.toThrow('El intento quedó registrado');
    await expect(users.assignRole('u1', 'TECH')).rejects.toThrow('incompatibles');
    await expect(users.listUsers()).rejects.toThrow('No se pudo conectar');
  });
});
