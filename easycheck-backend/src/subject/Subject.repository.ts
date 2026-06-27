import { Injectable } from '@nestjs/common';

export interface Subject {
  code: string;
  name: string;
  career: string;
}

@Injectable()
export class SubjectRepository {
  private readonly subjects: Subject[] = [];

  reset(): void {
    this.subjects.length = 0;
  }

  findByCode(code: string): Promise<Subject | null> {
    return Promise.resolve(this.subjects.find((s) => s.code === code) ?? null);
  }

  save(subject: Subject): Promise<Subject> {
    this.subjects.push(subject);
    return Promise.resolve(subject);
  }
}
