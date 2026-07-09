import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  NotFoundException,
  ConflictException,
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { AssistanceService } from './Assistance.service';
import { MockTokenService } from '../auth/application/mock-token.service';
import {
  StudentNotFoundException,
  InvalidStudentRutException,
  StudentAttendanceNotFoundException,
  SubjectNotAssignedException,
  ClassNotFoundException,
  RegistrationDisabledException,
  DuplicateAssistanceException,
  InvalidQRException,
} from './domain/assistance.errors';
import { RegisterAssistanceDto } from './dto/register-assistance.dto';

@Controller('api/v1')
export class AssistanceController {
  constructor(
    private readonly assistanceService: AssistanceService,
    private readonly mockTokenService: MockTokenService,
  ) {}

  // GET /api/v1/admin/students/:rut/attendance
  @Get('admin/students/:rut/attendance')
  async getStudentAttendanceForAdmin(@Param('rut') rut: string) {
    try {
      return await this.assistanceService.getStudentAttendanceByRut(rut);
    } catch (e) {
      if (e instanceof InvalidStudentRutException) {
        throw new BadRequestException({ error: e.message });
      }
      if (e instanceof StudentAttendanceNotFoundException) {
        throw new NotFoundException({ error: e.message, rut: e.rut });
      }
      throw e;
    }
  }

  // GET /api/v1/students/attendance
  @Get('students/attendance')
  async getAuthenticatedStudentAttendance(
    @Headers('authorization') authorization?: string,
  ) {
    const token = this.extractBearerToken(authorization);
    const payload = this.mockTokenService.parse(token);

    if (!payload) {
      throw new UnauthorizedException({ error: 'Token invalido' });
    }
    if (payload.role !== 'estudiante') {
      throw new ForbiddenException({
        error: 'Solo estudiantes pueden consultar su asistencia',
      });
    }

    try {
      return await this.assistanceService.getStudentAttendanceByRut(
        payload.rut,
      );
    } catch (e) {
      if (e instanceof InvalidStudentRutException) {
        throw new BadRequestException({ error: e.message });
      }
      if (e instanceof StudentAttendanceNotFoundException) {
        throw new NotFoundException({ error: e.message, rut: e.rut });
      }
      throw e;
    }
  }

  // GET /api/v1/professors/subjects/:subjectId/attendance
  @Get('professors/subjects/:subjectId/attendance')
  async getAuthenticatedProfessorSubjectAttendance(
    @Param('subjectId') subjectId: string,
    @Headers('authorization') authorization?: string,
  ) {
    const token = this.extractBearerToken(authorization);
    const payload = this.mockTokenService.parse(token);

    if (!payload) {
      throw new UnauthorizedException({ error: 'Token invalido' });
    }
    if (payload.role !== 'profesor') {
      throw new ForbiddenException({
        error: 'Solo profesores pueden consultar asistencia por asignatura',
      });
    }

    try {
      return await this.assistanceService.getStudentsAssistanceBySubject(
        payload.rut,
        subjectId,
      );
    } catch (e) {
      if (e instanceof SubjectNotAssignedException) {
        throw new NotFoundException({
          error: 'Subject not assigned to professor',
          professorRut: e.professorRut,
          subjectCode: e.subjectCode,
        });
      }
      throw e;
    }
  }

  // POST /api/v1/professors/subjects/:subjectId/classes/:classId/qr
  @Post('professors/subjects/:subjectId/classes/:classId/qr')
  @HttpCode(HttpStatus.CREATED)
  async generateAssistanceQr(
    @Param('subjectId') subjectId: string,
    @Param('classId') classIdParam: string,
    @Headers('authorization') authorization?: string,
  ) {
    const token = this.extractBearerToken(authorization);
    const payload = this.mockTokenService.parse(token);
    const classId = Number(classIdParam);

    if (!payload) {
      throw new UnauthorizedException({ error: 'Token invalido' });
    }
    if (payload.role !== 'profesor') {
      throw new ForbiddenException({
        error: 'Solo profesores pueden generar QR de asistencia',
      });
    }
    if (!Number.isInteger(classId) || classId < 1) {
      throw new BadRequestException({ error: 'Class id invalido' });
    }

    try {
      return await this.assistanceService.generateAssistanceQR(
        payload.rut,
        subjectId,
        classId,
      );
    } catch (e) {
      if (e instanceof SubjectNotAssignedException) {
        throw new NotFoundException({
          error: 'Subject not assigned to professor',
          professorRut: e.professorRut,
          subjectCode: e.subjectCode,
        });
      }
      if (e instanceof ClassNotFoundException) {
        throw new NotFoundException({ error: e.message, classId: e.classId });
      }
      if (e instanceof InvalidQRException) {
        throw new BadRequestException({ error: e.message });
      }
      throw e;
    }
  }

  // GET /api/v1/students/:rut/assistance?subject=XXX
  @Get('students/:rut/assistance')
  async getStudentAssistance(
    @Param('rut') rut: string,
    @Query('subject') subject: string,
  ) {
    try {
      return await this.assistanceService.getStudentAssistance(rut, subject);
    } catch (e) {
      if (e instanceof StudentNotFoundException) {
        throw new NotFoundException({ error: 'Student not found', rut: e.rut });
      }
      throw e;
    }
  }

  // POST /api/v1/assistance/register
  @Post('assistance/register')
  @HttpCode(HttpStatus.CREATED)
  async registerAssistance(@Body() dto: RegisterAssistanceDto) {
    try {
      return await this.assistanceService.registerAssistanceQR(dto);
    } catch (e) {
      if (e instanceof InvalidQRException) {
        throw new BadRequestException({ error: e.message });
      }
      if (e instanceof ClassNotFoundException) {
        throw new NotFoundException({ error: e.message, classId: e.classId });
      }
      if (e instanceof RegistrationDisabledException) {
        throw new ConflictException({ error: e.message, classId: e.classId });
      }
      if (e instanceof DuplicateAssistanceException) {
        throw new ConflictException({ error: e.message });
      }
      throw e;
    }
  }

  // GET /api/v1/professors/:rut/subjects/:code/assistance
  @Get('professors/:rut/subjects/:code/assistance')
  async getSubjectAssistance(
    @Param('rut') rut: string,
    @Param('code') code: string,
  ) {
    try {
      return await this.assistanceService.getStudentsAssistanceBySubject(
        rut,
        code,
      );
    } catch (e) {
      if (e instanceof SubjectNotAssignedException) {
        throw new NotFoundException({
          error: 'Subject not assigned to professor',
          professorRut: e.professorRut,
          subjectCode: e.subjectCode,
        });
      }
      throw e;
    }
  }

  private extractBearerToken(authorization?: string): string {
    const match = /^Bearer\s+(.+)$/.exec(authorization ?? '');
    if (!match) {
      throw new UnauthorizedException({ error: 'Token requerido' });
    }
    return match[1];
  }
}
