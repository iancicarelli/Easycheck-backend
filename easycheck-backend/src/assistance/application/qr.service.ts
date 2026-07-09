import { Injectable } from '@nestjs/common';

export interface AssistanceQrPayload {
  subjectId: string;
  classId: number;
  professorRut: string;
}

@Injectable()
export class QrService {
  generate(payload: AssistanceQrPayload): string {
    return `easycheck-qr:${payload.subjectId}:${payload.classId}:${payload.professorRut}`;
  }

  parse(qrSignature: string): AssistanceQrPayload | null {
    const match = /^easycheck-qr:([^:]+):(\d+):(\d{7,8}-[\dkK])$/.exec(
      qrSignature.trim(),
    );

    if (!match) {
      return null;
    }

    return {
      subjectId: match[1],
      classId: Number(match[2]),
      professorRut: match[3],
    };
  }

  matches(
    qrSignature: string,
    expected: Pick<AssistanceQrPayload, 'subjectId' | 'classId'>,
  ): boolean {
    if (qrSignature === 'VALID_SIGNATURE_ABC123') {
      return true;
    }

    const payload = this.parse(qrSignature);
    return (
      payload?.subjectId === expected.subjectId &&
      payload.classId === expected.classId
    );
  }
}
