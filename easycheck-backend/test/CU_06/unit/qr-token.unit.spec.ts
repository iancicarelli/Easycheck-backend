import { QrTokenService } from '../../../src/assistance/qr-token.service';

describe('CU-06 QrTokenService', () => {
  let service: QrTokenService;

  beforeEach(() => {
    service = new QrTokenService();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('firma y recupera identidad, clase y asignatura', () => {
    const generated = service.create('11111111-1', 1001, 'ASG-01');
    expect(service.verify(generated.qrToken)).toMatchObject({
      studentRut: '11111111-1',
      classId: 1001,
      subjectId: 'ASG-01',
    });
  });

  it('genera un nonce distinto para cada QR', () => {
    const first = service.verify(
      service.create('11111111-1', 1001, 'ASG-01').qrToken,
    );
    const second = service.verify(
      service.create('11111111-1', 1001, 'ASG-01').qrToken,
    );
    expect(first?.nonce).not.toBe(second?.nonce);
  });

  it('rechaza una firma alterada', () => {
    const { qrToken } = service.create('11111111-1', 1001, 'ASG-01');
    expect(service.verify(`${qrToken.slice(0, -1)}x`)).toBeNull();
  });

  it('rechaza un token mal formado', () => {
    expect(service.verify('token-invalido')).toBeNull();
  });

  it('rechaza un QR vencido', () => {
    const now = Date.parse('2026-07-12T12:00:00Z');
    jest.spyOn(Date, 'now').mockReturnValue(now);
    const generated = service.create('11111111-1', 1001, 'ASG-01');
    jest.spyOn(Date, 'now').mockReturnValue(now + 301_000);
    expect(service.verify(generated.qrToken)).toBeNull();
  });
});
