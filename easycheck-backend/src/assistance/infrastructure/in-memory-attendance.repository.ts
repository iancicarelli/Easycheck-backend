import { Injectable } from '@nestjs/common';
import type { AssistanceRecord } from '../Data.repository';

@Injectable()
export class InMemoryAttendanceRepository {
  private assistances: AssistanceRecord[] = [];

  seedAssistance(record: AssistanceRecord): void {
    const exists = this.assistances.some(
      (assistance) => assistance.id === record.id,
    );
    if (exists) return;
    this.assistances.push(record);
  }

  reset(): void {
    this.assistances = [];
  }

  findAssistancesByStudentAndSubject(
    studentRut: string,
    subjectId: string,
  ): AssistanceRecord[] {
    return this.assistances.filter(
      (assistance) =>
        assistance.studentRut === studentRut &&
        assistance.subjectId === subjectId,
    );
  }

  assistanceExists(studentRut: string, classId: number): boolean {
    return this.assistances.some(
      (assistance) =>
        assistance.studentRut === studentRut && assistance.classId === classId,
    );
  }

  insertAssistance(record: Omit<AssistanceRecord, 'id'>): AssistanceRecord {
    const created: AssistanceRecord = { id: Date.now(), ...record };
    this.assistances.push(created);
    return created;
  }

  countPresentByStudentAndSubject(studentRut: string, subjectId: string): number {
    return this.assistances.filter(
      (assistance) =>
        assistance.studentRut === studentRut &&
        assistance.subjectId === subjectId &&
        assistance.present,
    ).length;
  }
}
