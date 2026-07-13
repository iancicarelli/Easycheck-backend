import type { QueryRunner } from 'typeorm';
import { InitialIntegratedSchema1760000000000 } from '../../../src/database/migrations/1760000000000-InitialIntegratedSchema';

describe('Bloque 7 - migracion integrada', () => {
  it('incluye las tablas y columnas agregadas durante la integracion', async () => {
    const query = jest.fn().mockResolvedValue(undefined);
    const runner = { query } as unknown as QueryRunner;
    await new InitialIntegratedSchema1760000000000().up(runner);

    const sql = query.mock.calls
      .map((call: unknown[]) => String(call[0]))
      .join('\n');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS "users"');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS "used_qr_nonces"');
    expect(sql).toContain('"editingStatus"');
    expect(sql).toContain('"external_id"');
    expect(sql).toContain('"last_synced_at"');
  });
});
