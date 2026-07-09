import { Injectable } from '@nestjs/common';
import { Subject } from '../domain/subject.types';

@Injectable()
export class SubjectRepository {
  private readonly subjects: Subject[] = [];

  findByCode(code: string): Promise<Subject | null> {
    return Promise.resolve(this.subjects.find((subject) => subject.code === code) ?? null);
  }

  findAll(): Promise<Subject[]> {
    return Promise.resolve([...this.subjects]);
  }

  save(subject: Subject): Promise<Subject> {
    const existing = this.subjects.find((item) => item.code === subject.code);
    if (existing) {
      Object.assign(existing, subject);
      return Promise.resolve(existing);
    }
    this.subjects.push(subject);
    return Promise.resolve(subject);
  }

  count(): number {
    return this.subjects.length;
  }

  reset(): void {
    this.subjects.length = 0;
  }
}
