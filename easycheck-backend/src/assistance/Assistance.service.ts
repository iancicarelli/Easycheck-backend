import { Injectable } from '@nestjs/common';
import { IsString } from 'class-validator';
import {
  DataRepository,
  StudentAssistance,
  AssistanceRecord,
  StudentSubjectAttendance,
} from './Data.repository';
import {
  StudentNotFoundException,
  SubjectNotAssignedException,
  RegistrationDisabledException,
  DuplicateAssistanceException,
  InvalidQRException,
  InvalidRutException,
  ClassNotFoundException,
  RegistrationAlreadyDisabledException,
  RegistrationAlreadyEnabledException,
  AssistanceRecordNotFoundException,
  StudentNotEnrolledException,
  QRAlreadyUsedException,
  EditingAlreadyEnabledException,
  EditingAlreadyDisabledException,
  EditingDisabledException,
  RegistrationMustBeDisabledException,
} from '../common/exceptions';
import { QrTokenService } from './qr-token.service';

export interface StudentAssistanceDto {
  studentRut: string;
  subjectId: string;
  records: AssistanceRecord[];
  totalClasses: number;
  classesAttended: number;
  assistancePercentage: number;
}

// Con decoradores de class-validator: el ValidationPipe global de main.ts usa
// whitelist+forbidNonWhitelisted, y sin decoradores rechazaba TODO el body en
// el bootstrap real (los tests de integración no aplican el pipe global).
export class RegisterAssistanceDto {
  @IsString()
  qrToken!: string;
}

export interface AssistanceConfirmationDto {
  message: string;
  recordId: number;
  studentRut: string;
  classId: number;
}

export interface GeneratedQrDto {
  studentRut: string;
  classId: number;
  subjectId: string;
  qrToken: string;
  expiresAt: string;
}

export interface StudentSubjectAttendanceDto extends StudentSubjectAttendance {
  attendancePercentage: number;
}

export interface StudentClassSessionDto {
  classId: number;
  subjectId: string;
  date: Date;
  registrationStatus: 'ENABLED' | 'DISABLED';
}

export interface ProfessorClassSessionDto {
  classId: number;
  subjectId: string;
  date: Date;
  registrationStatus: 'ENABLED' | 'DISABLED';
  editingStatus: 'ENABLED' | 'DISABLED';
}

export interface CurrentStudentAttendanceDto {
  studentRut: string;
  subjectId: string;
  attendedClasses: number;
  totalClasses: number;
  attendancePercentage: number;
}

// CU-07 / CU-08 — body de PATCH professors/:rut/classes/:id/registration
export interface UpdateRegistrationStatusDto {
  status: 'ENABLED' | 'DISABLED';
}

// CU-08 — body de PATCH professors/:rut/assistance/:id
export interface EditAssistanceDto {
  present: boolean;
}

export interface UpdateEditingStatusDto {
  status: 'ENABLED' | 'DISABLED';
}

export interface RegistrationStatusConfirmationDto {
  message: string;
  classId: number;
  registrationStatus: 'ENABLED' | 'DISABLED';
}

export interface EditAssistanceConfirmationDto {
  message: string;
  recordId: number;
  studentRut: string;
  present: boolean;
}

export interface EditingStatusConfirmationDto {
  message: string;
  classId: number;
  editingStatus: 'ENABLED' | 'DISABLED';
  registrationStatus: 'ENABLED' | 'DISABLED';
}

@Injectable()
export class AssistanceService {
  constructor(
    private readonly dataRepository: DataRepository,
    private readonly qrTokens: QrTokenService,
  ) {}

  async getStudentAttendanceByRut(
    rut: string,
  ): Promise<StudentSubjectAttendanceDto[]> {
    if (!this.isValidRut(rut)) {
      throw new InvalidRutException(rut);
    }

    const student = await this.dataRepository.findStudent(rut);
    if (!student) {
      throw new StudentNotFoundException(rut);
    }

    const attendanceRows =
      await this.dataRepository.findStudentAttendanceByRut(rut);

    return attendanceRows.map((row) => ({
      ...row,
      attendancePercentage:
        row.totalClasses > 0
          ? Math.round((row.attendedClasses / row.totalClasses) * 100)
          : 0,
    }));
  }

  async getCurrentStudentSubjectAttendance(
    studentRut: string,
    subjectId: string,
  ): Promise<CurrentStudentAttendanceDto> {
    const student = await this.dataRepository.findStudent(studentRut);
    if (!student) throw new StudentNotFoundException(studentRut);

    const rows =
      await this.dataRepository.findStudentAttendanceByRut(studentRut);
    const row = rows.find((item) => item.subjectName === subjectId);
    if (!row) throw new StudentNotEnrolledException(studentRut, subjectId);

    return {
      studentRut,
      subjectId,
      attendedClasses: row.attendedClasses,
      totalClasses: row.totalClasses,
      attendancePercentage:
        row.totalClasses > 0
          ? Math.round((row.attendedClasses / row.totalClasses) * 100)
          : 0,
    };
  }

  // CU-06 (móvil): clases de las asignaturas donde el estudiante está inscrito,
  // para que la app pueda ofrecer a cuál generar el QR de asistencia.
  async getCurrentStudentClasses(
    studentRut: string,
  ): Promise<StudentClassSessionDto[]> {
    const student = await this.dataRepository.findStudent(studentRut);
    if (!student) throw new StudentNotFoundException(studentRut);

    const classes = await this.dataRepository.findClassesForStudent(studentRut);
    return classes.map((c) => ({
      classId: c.id,
      subjectId: c.subjectId,
      date: c.date,
      registrationStatus: c.registrationStatus,
    }));
  }

  // CU-07/CU-08 (apoyo): clases que dicta el profesor con sus estados, para que
  // el panel liste los ids en vez de exigir escribirlos a mano.
  async getCurrentProfessorClasses(
    professorRut: string,
  ): Promise<ProfessorClassSessionDto[]> {
    const classes =
      await this.dataRepository.findClassesForProfessor(professorRut);
    return classes.map((c) => ({
      classId: c.id,
      subjectId: c.subjectId,
      date: c.date,
      registrationStatus: c.registrationStatus,
      editingStatus: c.editingStatus ?? 'DISABLED',
    }));
  }

  private isValidRut(rut: string): boolean {
    const cleanRut = rut.replaceAll('.', '').toUpperCase();
    const match = /^(\d{7,8})-([\dK])$/.exec(cleanRut);

    if (!match) {
      return false;
    }

    const [, body, verifier] = match;
    let multiplier = 2;
    let sum = 0;

    for (let i = body.length - 1; i >= 0; i--) {
      sum += Number(body[i]) * multiplier;
      multiplier = multiplier === 7 ? 2 : multiplier + 1;
    }

    const expectedValue = 11 - (sum % 11);
    const verifierIfNotEleven = expectedValue === 10 ? 'K' : `${expectedValue}`;
    const expectedVerifier = expectedValue === 11 ? '0' : verifierIfNotEleven;

    return verifier === expectedVerifier;
  }

  // ── IT-1 / IT-2: Show a student's assistance ─────────────────────────────
  async getStudentAssistance(
    studentRut: string,
    subjectId: string,
  ): Promise<StudentAssistanceDto> {
    const student = await this.dataRepository.findStudent(studentRut);
    if (!student) {
      throw new StudentNotFoundException(studentRut);
    }

    const records =
      await this.dataRepository.findAssistancesByStudentAndSubject(
        studentRut,
        subjectId,
      );

    const classesAttended = records.filter((r) => r.present).length;
    const totalClasses = records.length;
    const assistancePercentage =
      totalClasses > 0 ? Math.round((classesAttended / totalClasses) * 100) : 0;

    return {
      studentRut,
      subjectId,
      records,
      totalClasses,
      classesAttended,
      assistancePercentage,
    };
  }

  // ── IT-3 / IT-4: Register assistance via QR ──────────────────────────────
  async generateStudentQr(
    studentRut: string,
    classId: number,
  ): Promise<GeneratedQrDto> {
    const student = await this.dataRepository.findStudent(studentRut);
    if (!student) throw new StudentNotFoundException(studentRut);

    const classSession = await this.dataRepository.findClass(classId);
    if (!classSession) throw new ClassNotFoundException(classId);

    const enrolled = await this.dataRepository.isStudentEnrolled(
      studentRut,
      classSession.subjectId,
    );
    if (!enrolled) {
      throw new StudentNotEnrolledException(studentRut, classSession.subjectId);
    }
    if (classSession.registrationStatus === 'DISABLED') {
      throw new RegistrationDisabledException(classId);
    }

    return {
      studentRut,
      classId,
      subjectId: classSession.subjectId,
      ...this.qrTokens.create(studentRut, classId, classSession.subjectId),
    };
  }

  async registerAssistanceQR(
    dto: RegisterAssistanceDto,
  ): Promise<AssistanceConfirmationDto> {
    const claims = this.qrTokens.verify(dto.qrToken ?? '');
    if (!claims) throw new InvalidQRException();

    const classSession = await this.dataRepository.findClass(claims.classId);
    if (!classSession) throw new ClassNotFoundException(claims.classId);
    if (classSession.subjectId !== claims.subjectId) {
      throw new InvalidQRException();
    }
    if (classSession.registrationStatus === 'DISABLED') {
      throw new RegistrationDisabledException(claims.classId);
    }

    const enrolled = await this.dataRepository.isStudentEnrolled(
      claims.studentRut,
      claims.subjectId,
    );
    if (!enrolled) {
      throw new StudentNotEnrolledException(
        claims.studentRut,
        claims.subjectId,
      );
    }

    const alreadyRegistered = await this.dataRepository.assistanceExists(
      claims.studentRut,
      claims.classId,
    );
    if (alreadyRegistered) {
      throw new DuplicateAssistanceException(claims.studentRut, claims.classId);
    }

    const firstUse = await this.dataRepository.consumeQrNonce(claims.nonce);
    if (!firstUse) throw new QRAlreadyUsedException();

    const record = await this.dataRepository.insertAssistance({
      studentRut: claims.studentRut,
      classId: claims.classId,
      subjectId: claims.subjectId,
      date: new Date(),
      present: true,
    });

    return {
      message: 'Assistance registered successfully',
      recordId: record.id,
      studentRut: claims.studentRut,
      classId: claims.classId,
    };
  }

  // ── IT-5 / IT-6: Show assistance of students in a subject ────────────────
  async getStudentsAssistanceBySubject(
    professorRut: string,
    subjectId: string,
  ): Promise<StudentAssistance[]> {
    const teaches = await this.dataRepository.findTeaching(
      professorRut,
      subjectId,
    );
    if (!teaches) {
      throw new SubjectNotAssignedException(professorRut, subjectId);
    }

    return this.dataRepository.findStudentsAssistanceBySubject(subjectId);
  }

  // ── CU-07: Disable assistance registration for a class ───────────────────
  async disableRegistration(
    professorRut: string,
    classId: number,
  ): Promise<RegistrationStatusConfirmationDto> {
    const classSession = await this.assertProfessorOwnsClass(
      professorRut,
      classId,
    );

    if (classSession.registrationStatus === 'DISABLED') {
      throw new RegistrationAlreadyDisabledException(classId);
    }

    await this.dataRepository.updateClassRegistrationStatus(
      classId,
      'DISABLED',
    );

    return {
      message: 'Registration disabled successfully',
      classId,
      registrationStatus: 'DISABLED',
    };
  }

  // ── CU-08: Re-enable assistance registration for a class ─────────────────
  async enableRegistration(
    professorRut: string,
    classId: number,
  ): Promise<RegistrationStatusConfirmationDto> {
    const classSession = await this.assertProfessorOwnsClass(
      professorRut,
      classId,
    );

    if (classSession.registrationStatus === 'ENABLED') {
      throw new RegistrationAlreadyEnabledException(classId);
    }

    await this.dataRepository.updateClassRegistrationStatus(classId, 'ENABLED');
    await this.dataRepository.updateClassEditingStatus(classId, 'DISABLED');

    return {
      message: 'Registration enabled successfully',
      classId,
      registrationStatus: 'ENABLED',
    };
  }

  async enableEditing(
    professorRut: string,
    classId: number,
  ): Promise<EditingStatusConfirmationDto> {
    const classSession = await this.assertProfessorOwnsClass(
      professorRut,
      classId,
    );
    if (classSession.registrationStatus !== 'DISABLED') {
      throw new RegistrationMustBeDisabledException(classId);
    }
    if (classSession.editingStatus === 'ENABLED') {
      throw new EditingAlreadyEnabledException(classId);
    }

    await this.dataRepository.updateClassEditingStatus(classId, 'ENABLED');
    return {
      message: 'Editing enabled successfully',
      classId,
      editingStatus: 'ENABLED',
      registrationStatus: 'DISABLED',
    };
  }

  async disableEditing(
    professorRut: string,
    classId: number,
  ): Promise<EditingStatusConfirmationDto> {
    const classSession = await this.assertProfessorOwnsClass(
      professorRut,
      classId,
    );
    if (classSession.editingStatus !== 'ENABLED') {
      throw new EditingAlreadyDisabledException(classId);
    }

    await this.dataRepository.updateClassEditingStatus(classId, 'DISABLED');
    return {
      message: 'Editing disabled successfully',
      classId,
      editingStatus: 'DISABLED',
      registrationStatus: classSession.registrationStatus,
    };
  }

  // ── CU-08: Edit a student's assistance record (present/absent) ───────────
  async editAssistance(
    professorRut: string,
    recordId: number,
    present: boolean,
  ): Promise<EditAssistanceConfirmationDto> {
    const record = await this.dataRepository.findAssistanceById(recordId);
    if (!record) {
      throw new AssistanceRecordNotFoundException(recordId);
    }

    const classSession = await this.dataRepository.findClass(record.classId);
    if (!classSession) throw new ClassNotFoundException(record.classId);

    const teaches = await this.dataRepository.findTeaching(
      professorRut,
      record.subjectId,
    );
    if (!teaches) {
      throw new SubjectNotAssignedException(professorRut, record.subjectId);
    }
    if (classSession.editingStatus !== 'ENABLED') {
      throw new EditingDisabledException(record.classId);
    }

    await this.dataRepository.updateAssistancePresence(recordId, present);

    return {
      message: 'Assistance record updated successfully',
      recordId,
      studentRut: record.studentRut,
      present,
    };
  }

  // Shared CU-07/CU-08 check: the class exists and the professor teaches it.
  private async assertProfessorOwnsClass(
    professorRut: string,
    classId: number,
  ) {
    const classSession = await this.dataRepository.findClass(classId);
    if (!classSession) {
      throw new ClassNotFoundException(classId);
    }

    const teaches = await this.dataRepository.findTeaching(
      professorRut,
      classSession.subjectId,
    );
    if (!teaches) {
      throw new SubjectNotAssignedException(
        professorRut,
        classSession.subjectId,
      );
    }

    return classSession;
  }
}
