import { Injectable } from '@nestjs/common';

export interface Subject {
  code: string;
  name: string;
  career: string;
  source?: 'LOCAL' | 'INTRANET';
  externalId?: string | null;
  lastSyncedAt?: Date | null;
}

@Injectable()
export class SubjectRepository {
  private readonly subjects: Subject[] = [];

  findByCode(code: string): Promise<Subject | null> {
    return Promise.resolve(this.subjects.find((s) => s.code === code) ?? null);
  }

  save(subject: Subject): Promise<Subject> {
    const saved = { ...subject, source: subject.source ?? 'LOCAL' } as Subject;
    this.subjects.push(saved);
    return Promise.resolve(saved);
  }

  upsertFromIntranet(subject: Subject): Promise<Subject> {
    const existing = this.subjects.find((item) => item.code === subject.code);
    if (existing?.source === 'LOCAL') return Promise.resolve(existing);

    const synchronized: Subject = {
      ...subject,
      source: 'INTRANET',
      lastSyncedAt: new Date(),
    };
    if (existing) Object.assign(existing, synchronized);
    else this.subjects.push(synchronized);
    return Promise.resolve(existing ?? synchronized);
  }

  findAll(): Promise<Subject[]> {
    return Promise.resolve([...this.subjects]);
  }

  count(): Promise<number> {
    return Promise.resolve(this.subjects.length);
  }

  reset(): void {
    this.subjects.length = 0;
  }
}
