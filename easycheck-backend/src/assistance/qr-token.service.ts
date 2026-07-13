import { Injectable } from '@nestjs/common';
import { createHmac, randomUUID, timingSafeEqual } from 'crypto';

export interface QrClaims {
  studentRut: string;
  classId: number;
  subjectId: string;
  issuedAt: number;
  expiresAt: number;
  nonce: string;
}

@Injectable()
export class QrTokenService {
  private readonly ttlMs = this.readTtl();
  private readonly secret =
    process.env.QR_SIGNING_SECRET ?? 'easycheck-local-development-secret';

  create(
    studentRut: string,
    classId: number,
    subjectId: string,
  ): {
    qrToken: string;
    expiresAt: string;
  } {
    const issuedAt = Date.now();
    const claims: QrClaims = {
      studentRut,
      classId,
      subjectId,
      issuedAt,
      expiresAt: issuedAt + this.ttlMs,
      nonce: randomUUID(),
    };
    const encoded = Buffer.from(JSON.stringify(claims)).toString('base64url');
    return {
      qrToken: `${encoded}.${this.sign(encoded)}`,
      expiresAt: new Date(claims.expiresAt).toISOString(),
    };
  }

  verify(token: string): QrClaims | null {
    const [encoded, providedSignature, extra] = token.trim().split('.');
    if (!encoded || !providedSignature || extra) return null;

    const expected = Buffer.from(this.sign(encoded));
    const provided = Buffer.from(providedSignature);
    if (
      expected.length !== provided.length ||
      !timingSafeEqual(expected, provided)
    ) {
      return null;
    }

    try {
      const claims = JSON.parse(
        Buffer.from(encoded, 'base64url').toString('utf8'),
      ) as Partial<QrClaims>;
      if (
        typeof claims.studentRut !== 'string' ||
        !Number.isInteger(claims.classId) ||
        typeof claims.subjectId !== 'string' ||
        typeof claims.issuedAt !== 'number' ||
        typeof claims.expiresAt !== 'number' ||
        typeof claims.nonce !== 'string' ||
        claims.expiresAt <= Date.now() ||
        claims.issuedAt > Date.now() + 30_000
      ) {
        return null;
      }
      return claims as QrClaims;
    } catch {
      return null;
    }
  }

  private sign(encoded: string): string {
    return createHmac('sha256', this.secret)
      .update(encoded)
      .digest('base64url');
  }

  private readTtl(): number {
    const configured = Number(process.env.QR_TTL_SECONDS ?? '300');
    return Number.isFinite(configured) && configured > 0
      ? configured * 1000
      : 300_000;
  }
}
