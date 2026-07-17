import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  AssistanceRecord,
  ClassSession,
  StudentAssistance,
  StudentSubjectAttendance,
} from './Data.repository';
import { StudentEntity } from '../database/entities/student.entity';
import { EnrollmentEntity } from '../database/entities/enrollment.entity';
import { ClassSessionEntity } from '../database/entities/class-session.entity';
import { TeachingEntity } from '../database/entities/teaching.entity';
import { AssistanceEntity } from '../database/entities/assistance.entity';
import { ProfessorEntity } from '../database/entities/professor.entity';
import { QrNonceEntity } from '../database/entities/qr-nonce.entity';

/**
 * Implementación Postgres/TypeORM de DataRepository.
 *
 * Se registra bajo el MISMO token (`DataRepository`) cuando `DB_HOST` está
 * definido (modo Docker/DB), así AssistanceService no se entera del cambio:
 * mismos nombres de método y mismas firmas async que la versión in-memory.
 * Los helpers `seed*()`/`reset()` NO se portan: son fixtures de test y los
 * tests corren siempre contra la implementación in-memory (ver CLAUDE.md).
 */
@Injectable()
export class TypeOrmDataRepository {
  constructor(
    @InjectRepository(StudentEntity)
    private readonly students: Repository<StudentEntity>,
    @InjectRepository(EnrollmentEntity)
    private readonly enrollments: Repository<EnrollmentEntity>,
    @InjectRepository(ClassSessionEntity)
    private readonly classes: Repository<ClassSessionEntity>,
    @InjectRepository(TeachingEntity)
    private readonly teachings: Repository<TeachingEntity>,
    @InjectRepository(AssistanceEntity)
    private readonly assistances: Repository<AssistanceEntity>,
    @InjectRepository(ProfessorEntity)
    private readonly professors: Repository<ProfessorEntity>,
    @InjectRepository(QrNonceEntity)
    private readonly qrNonces: Repository<QrNonceEntity>,
  ) {}

  async upsertStudent(rut: string, name: string): Promise<void> {
    await this.students.upsert({ rut, name }, ['rut']);
  }

  async upsertProfessor(rut: string, name: string): Promise<void> {
    await this.professors.upsert({ rut, name }, ['rut']);
  }

  async upsertEnrollment(studentRut: string, subjectId: string): Promise<void> {
    await this.enrollments.upsert({ studentRut, subjectId }, [
      'studentRut',
      'subjectId',
    ]);
  }

  async upsertTeaching(professorRut: string, subjectId: string): Promise<void> {
    await this.teachings.upsert({ professorRut, subjectId }, [
      'professorRut',
      'subjectId',
    ]);
  }

  async upsertClass(classSession: ClassSession): Promise<void> {
    await this.classes.upsert(classSession, ['id']);
  }

  countStudents(): Promise<number> {
    return this.students.count();
  }

  countProfessors(): Promise<number> {
    return this.professors.count();
  }

  countEnrollments(): Promise<number> {
    return this.enrollments.count();
  }

  countTeachings(): Promise<number> {
    return this.teachings.count();
  }

  countClasses(): Promise<number> {
    return this.classes.count();
  }

  async findStudent(
    rut: string,
  ): Promise<{ rut: string; name: string } | null> {
    return this.students.findOneBy({ rut });
  }

  isStudentEnrolled(studentRut: string, subjectId: string): Promise<boolean> {
    return this.enrollments.existsBy({ studentRut, subjectId });
  }

  async consumeQrNonce(nonce: string): Promise<boolean> {
    try {
      await this.qrNonces.insert({ nonce, usedAt: new Date() });
      return true;
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === '23505'
      ) {
        return false;
      }
      throw error;
    }
  }

  async findAssistancesByStudentAndSubject(
    studentRut: string,
    subjectId: string,
  ): Promise<AssistanceRecord[]> {
    return this.assistances.find({ where: { studentRut, subjectId } });
  }

  async findStudentAttendanceByRut(
    studentRut: string,
  ): Promise<StudentSubjectAttendance[]> {
    const enrolled = await this.enrollments.find({ where: { studentRut } });

    return Promise.all(
      enrolled.map(async (e) => ({
        subjectName: e.subjectId,
        attendedClasses: await this.assistances.countBy({
          studentRut,
          subjectId: e.subjectId,
          present: true,
        }),
        totalClasses: await this.classes.countBy({ subjectId: e.subjectId }),
      })),
    );
  }

  async findClass(classId: number): Promise<ClassSession | null> {
    return this.classes.findOneBy({ id: classId });
  }

  async findClassesForStudent(studentRut: string): Promise<ClassSession[]> {
    const enrolled = await this.enrollments.find({ where: { studentRut } });
    if (enrolled.length === 0) return [];
    return this.classes.find({
      where: { subjectId: In(enrolled.map((e) => e.subjectId)) },
      order: { id: 'ASC' },
    });
  }

  async findClassesForProfessor(professorRut: string): Promise<ClassSession[]> {
    const taught = await this.teachings.find({ where: { professorRut } });
    if (taught.length === 0) return [];
    return this.classes.find({
      where: { subjectId: In(taught.map((t) => t.subjectId)) },
      order: { id: 'ASC' },
    });
  }

  async updateClassRegistrationStatus(
    classId: number,
    status: 'ENABLED' | 'DISABLED',
  ): Promise<ClassSession | null> {
    const classSession = await this.classes.findOneBy({ id: classId });
    if (!classSession) {
      return null;
    }
    classSession.registrationStatus = status;
    return this.classes.save(classSession);
  }

  async updateClassEditingStatus(
    classId: number,
    status: 'ENABLED' | 'DISABLED',
  ): Promise<ClassSession | null> {
    const classSession = await this.classes.findOneBy({ id: classId });
    if (!classSession) return null;
    classSession.editingStatus = status;
    return this.classes.save(classSession);
  }

  async findAssistanceById(id: number): Promise<AssistanceRecord | null> {
    return this.assistances.findOneBy({ id });
  }

  async updateAssistancePresence(
    id: number,
    present: boolean,
  ): Promise<AssistanceRecord | null> {
    const record = await this.assistances.findOneBy({ id });
    if (!record) {
      return null;
    }
    record.present = present;
    return this.assistances.save(record);
  }

  async assistanceExists(
    studentRut: string,
    classId: number,
  ): Promise<boolean> {
    return this.assistances.existsBy({ studentRut, classId });
  }

  async insertAssistance(
    record: Omit<AssistanceRecord, 'id'>,
  ): Promise<AssistanceRecord> {
    return this.assistances.save(this.assistances.create(record));
  }

  async findTeaching(
    professorRut: string,
    subjectId: string,
  ): Promise<boolean> {
    return this.teachings.existsBy({ professorRut, subjectId });
  }

  async findStudentsAssistanceBySubject(
    subjectId: string,
  ): Promise<StudentAssistance[]> {
    const enrolled = await this.enrollments.find({ where: { subjectId } });
    const totalClasses = await this.classes.countBy({ subjectId });

    return Promise.all(
      enrolled.map(async (e) => {
        const student = await this.students.findOneBy({ rut: e.studentRut });
        const classesAttended = await this.assistances.countBy({
          studentRut: e.studentRut,
          subjectId,
          present: true,
        });
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
