import { Injectable } from '@nestjs/common';
import type { ClassSession } from '../Data.repository';

export interface StudentRecord {
  rut: string;
  name: string;
}

export interface EnrollmentRecord {
  studentRut: string;
  subjectId: string;
}

export interface SubjectRecord {
  code: string;
  name: string;
}

export interface TeachingRecord {
  professorRut: string;
  subjectId: string;
}

@Injectable()
export class InMemoryAcademicRepository {
  private classes: ClassSession[] = [];
  private enrollments: EnrollmentRecord[] = [];
  private teachings: TeachingRecord[] = [];
  private students: StudentRecord[] = [];
  private subjects: SubjectRecord[] = [];

  seedStudent(rut: string, name: string): void {
    const existing = this.students.find((student) => student.rut === rut);
    if (existing) {
      existing.name = name;
      return;
    }
    this.students.push({ rut, name });
  }

  seedEnrollment(studentRut: string, subjectId: string): void {
    const exists = this.enrollments.some(
      (enrollment) =>
        enrollment.studentRut === studentRut &&
        enrollment.subjectId === subjectId,
    );
    if (exists) return;
    this.enrollments.push({ studentRut, subjectId });
  }

  seedSubject(subject: SubjectRecord): void {
    const existing = this.subjects.find((item) => item.code === subject.code);
    if (existing) {
      existing.name = subject.name;
      return;
    }
    this.subjects.push(subject);
  }

  seedClass(classSession: ClassSession): void {
    const existing = this.classes.find((item) => item.id === classSession.id);
    if (existing) {
      Object.assign(existing, classSession);
      return;
    }
    this.classes.push(classSession);
  }

  seedTeaching(professorRut: string, subjectId: string): void {
    const exists = this.teachings.some(
      (teaching) =>
        teaching.professorRut === professorRut &&
        teaching.subjectId === subjectId,
    );
    if (exists) return;
    this.teachings.push({ professorRut, subjectId });
  }

  reset(): void {
    this.classes = [];
    this.enrollments = [];
    this.teachings = [];
    this.students = [];
    this.subjects = [];
  }

  findStudent(rut: string): StudentRecord | null {
    return this.students.find((student) => student.rut === rut) ?? null;
  }

  findClass(classId: number): ClassSession | null {
    return this.classes.find((classSession) => classSession.id === classId) ?? null;
  }

  findTeaching(professorRut: string, subjectId: string): boolean {
    return this.teachings.some(
      (teaching) =>
        teaching.professorRut === professorRut &&
        teaching.subjectId === subjectId,
    );
  }

  findEnrollmentsByStudent(studentRut: string): EnrollmentRecord[] {
    return this.enrollments.filter(
      (enrollment) => enrollment.studentRut === studentRut,
    );
  }

  findSubjectName(subjectId: string): string {
    return (
      this.subjects.find((subject) => subject.code === subjectId)?.name ??
      subjectId
    );
  }

  findEnrollmentsBySubject(subjectId: string): EnrollmentRecord[] {
    return this.enrollments.filter(
      (enrollment) => enrollment.subjectId === subjectId,
    );
  }

  findClassesBySubject(subjectId: string): ClassSession[] {
    return this.classes.filter((classSession) => classSession.subjectId === subjectId);
  }

  countStudents(): number {
    return this.students.length;
  }

  countEnrollments(): number {
    return this.enrollments.length;
  }

  countClasses(): number {
    return this.classes.length;
  }

  countTeachings(): number {
    return this.teachings.length;
  }
}
