import { Injectable } from '@nestjs/common';

export interface AssistanceRecord {
  id: number;
  studentRut: string;
  classId: number;
  subjectId: string;
  date: Date;
  present: boolean;
}

export interface ClassSession {
  id: number;
  subjectId: string;
  date: Date;
  registrationStatus: 'ENABLED' | 'DISABLED';
  editingStatus?: 'ENABLED' | 'DISABLED';
}

export interface StudentAssistance {
  rut: string;
  name: string;
  classesAttended: number;
  totalClasses: number;
  assistancePercentage: number;
}

export interface StudentSubjectAttendance {
  subjectName: string;
  attendedClasses: number;
  totalClasses: number;
}

@Injectable()
export class DataRepository {
  // Level 1 — in-memory stores (replace the real DB in tests)
  private assistances: AssistanceRecord[] = [];
  private classes: ClassSession[] = [];
  private enrollments: { studentRut: string; subjectId: string }[] = [];
  private teachings: { professorRut: string; subjectId: string }[] = [];
  private students: { rut: string; name: string }[] = [];
  private professors: { rut: string; name: string }[] = [];
  private usedQrNonces = new Set<string>();

  // ── seed helpers (used by the test fixtures) ──────────────────────────────
  seedStudent(rut: string, name: string) {
    this.students.push({ rut, name });
  }
  seedEnrollment(studentRut: string, subjectId: string) {
    this.enrollments.push({ studentRut, subjectId });
  }
  seedClass(classSession: ClassSession) {
    this.classes.push({ editingStatus: 'DISABLED', ...classSession });
  }
  seedAssistance(record: AssistanceRecord) {
    this.assistances.push(record);
  }
  seedTeaching(professorRut: string, subjectId: string) {
    this.teachings.push({ professorRut, subjectId });
  }
  reset() {
    this.assistances = [];
    this.classes = [];
    this.enrollments = [];
    this.teachings = [];
    this.students = [];
    this.professors = [];
    this.usedQrNonces.clear();
  }

  upsertStudent(rut: string, name: string): Promise<void> {
    const existing = this.students.find((student) => student.rut === rut);
    if (existing) existing.name = name;
    else this.students.push({ rut, name });
    return Promise.resolve();
  }

  upsertProfessor(rut: string, name: string): Promise<void> {
    const existing = this.professors.find((professor) => professor.rut === rut);
    if (existing) existing.name = name;
    else this.professors.push({ rut, name });
    return Promise.resolve();
  }

  upsertEnrollment(studentRut: string, subjectId: string): Promise<void> {
    const exists = this.enrollments.some(
      (item) => item.studentRut === studentRut && item.subjectId === subjectId,
    );
    if (!exists) this.enrollments.push({ studentRut, subjectId });
    return Promise.resolve();
  }

  upsertTeaching(professorRut: string, subjectId: string): Promise<void> {
    const exists = this.teachings.some(
      (item) =>
        item.professorRut === professorRut && item.subjectId === subjectId,
    );
    if (!exists) this.teachings.push({ professorRut, subjectId });
    return Promise.resolve();
  }

  upsertClass(classSession: ClassSession): Promise<void> {
    const normalized = { editingStatus: 'DISABLED' as const, ...classSession };
    const index = this.classes.findIndex((item) => item.id === classSession.id);
    if (index >= 0) this.classes[index] = normalized;
    else this.classes.push(normalized);
    return Promise.resolve();
  }

  countStudents(): Promise<number> {
    return Promise.resolve(this.students.length);
  }

  countProfessors(): Promise<number> {
    return Promise.resolve(this.professors.length);
  }

  countEnrollments(): Promise<number> {
    return Promise.resolve(this.enrollments.length);
  }

  countTeachings(): Promise<number> {
    return Promise.resolve(this.teachings.length);
  }

  countClasses(): Promise<number> {
    return Promise.resolve(this.classes.length);
  }

  findStudent(rut: string): Promise<{ rut: string; name: string } | null> {
    return Promise.resolve(this.students.find((s) => s.rut === rut) ?? null);
  }

  isStudentEnrolled(studentRut: string, subjectId: string): Promise<boolean> {
    return Promise.resolve(
      this.enrollments.some(
        (item) =>
          item.studentRut === studentRut && item.subjectId === subjectId,
      ),
    );
  }

  consumeQrNonce(nonce: string): Promise<boolean> {
    if (this.usedQrNonces.has(nonce)) return Promise.resolve(false);
    this.usedQrNonces.add(nonce);
    return Promise.resolve(true);
  }

  findAssistancesByStudentAndSubject(
    studentRut: string,
    subjectId: string,
  ): Promise<AssistanceRecord[]> {
    return Promise.resolve(
      this.assistances.filter(
        (a) => a.studentRut === studentRut && a.subjectId === subjectId,
      ),
    );
  }

  findStudentAttendanceByRut(
    studentRut: string,
  ): Promise<StudentSubjectAttendance[]> {
    const enrolled = this.enrollments.filter(
      (e) => e.studentRut === studentRut,
    );

    return Promise.resolve(
      enrolled.map((e) => {
        const subjectClasses = this.classes.filter(
          (c) => c.subjectId === e.subjectId,
        );
        const attendedClasses = this.assistances.filter(
          (a) =>
            a.studentRut === studentRut &&
            a.subjectId === e.subjectId &&
            a.present,
        ).length;

        return {
          subjectName: e.subjectId,
          attendedClasses,
          totalClasses: subjectClasses.length,
        };
      }),
    );
  }

  findClass(classId: number): Promise<ClassSession | null> {
    return Promise.resolve(this.classes.find((c) => c.id === classId) ?? null);
  }

  findClassesForStudent(studentRut: string): Promise<ClassSession[]> {
    const subjectIds = new Set(
      this.enrollments
        .filter((e) => e.studentRut === studentRut)
        .map((e) => e.subjectId),
    );
    return Promise.resolve(
      this.classes.filter((c) => subjectIds.has(c.subjectId)),
    );
  }

  findClassesForProfessor(professorRut: string): Promise<ClassSession[]> {
    const subjectIds = new Set(
      this.teachings
        .filter((t) => t.professorRut === professorRut)
        .map((t) => t.subjectId),
    );
    return Promise.resolve(
      this.classes.filter((c) => subjectIds.has(c.subjectId)),
    );
  }

  updateClassRegistrationStatus(
    classId: number,
    status: 'ENABLED' | 'DISABLED',
  ): Promise<ClassSession | null> {
    const classSession = this.classes.find((c) => c.id === classId);
    if (!classSession) {
      return Promise.resolve(null);
    }
    classSession.registrationStatus = status;
    return Promise.resolve(classSession);
  }

  updateClassEditingStatus(
    classId: number,
    status: 'ENABLED' | 'DISABLED',
  ): Promise<ClassSession | null> {
    const classSession = this.classes.find((c) => c.id === classId);
    if (!classSession) return Promise.resolve(null);
    classSession.editingStatus = status;
    return Promise.resolve(classSession);
  }

  findAssistanceById(id: number): Promise<AssistanceRecord | null> {
    return Promise.resolve(this.assistances.find((a) => a.id === id) ?? null);
  }

  updateAssistancePresence(
    id: number,
    present: boolean,
  ): Promise<AssistanceRecord | null> {
    const record = this.assistances.find((a) => a.id === id);
    if (!record) {
      return Promise.resolve(null);
    }
    record.present = present;
    return Promise.resolve(record);
  }

  assistanceExists(studentRut: string, classId: number): Promise<boolean> {
    return Promise.resolve(
      this.assistances.some(
        (a) => a.studentRut === studentRut && a.classId === classId,
      ),
    );
  }

  insertAssistance(
    record: Omit<AssistanceRecord, 'id'>,
  ): Promise<AssistanceRecord> {
    const created: AssistanceRecord = { id: Date.now(), ...record };
    this.assistances.push(created);
    return Promise.resolve(created);
  }

  findTeaching(professorRut: string, subjectId: string): Promise<boolean> {
    return Promise.resolve(
      this.teachings.some(
        (t) => t.professorRut === professorRut && t.subjectId === subjectId,
      ),
    );
  }

  findStudentsAssistanceBySubject(
    subjectId: string,
  ): Promise<StudentAssistance[]> {
    const enrolled = this.enrollments.filter((e) => e.subjectId === subjectId);
    const subjectClasses = this.classes.filter(
      (c) => c.subjectId === subjectId,
    );
    const totalClasses = subjectClasses.length;

    return Promise.resolve(
      enrolled.map((e) => {
        const student = this.students.find((s) => s.rut === e.studentRut);
        const classesAttended = this.assistances.filter(
          (a) =>
            a.studentRut === e.studentRut &&
            a.subjectId === subjectId &&
            a.present,
        ).length;
        const percentage =
          totalClasses > 0
            ? Math.round((classesAttended / totalClasses) * 100)
            : 0;
        return {
          rut: e.studentRut,
          name: student?.name ?? 'Unknown',
          classesAttended,
          totalClasses,
          assistancePercentage: percentage,
        };
      }),
    );
  }
}
