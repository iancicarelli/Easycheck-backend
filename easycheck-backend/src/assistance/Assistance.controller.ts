import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  HttpCode,
  HttpStatus,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ParseIntPipe,
  UseGuards,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import { AssistanceService, RegisterAssistanceDto } from './Assistance.service';
import type {
  UpdateRegistrationStatusDto,
  EditAssistanceDto,
  UpdateEditingStatusDto,
} from './Assistance.service';
import {
  AllowedRoles,
  TokenRolesGuard,
} from '../auth/application/token-roles.guard';
import type { TokenAuthenticatedRequest } from '../auth/application/token-roles.guard';
import { ReaderGuard } from './reader.guard';
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

@Controller('api/v1')
export class AssistanceController {
  constructor(private readonly assistanceService: AssistanceService) {}

  // CU-04 (móvil): resumen de asistencia por asignatura del estudiante del
  // token. Declarado antes de students/:rut/attendance para que «me» no sea
  // capturado como :rut.
  @Get('students/me/attendance')
  @AllowedRoles('estudiante')
  @UseGuards(TokenRolesGuard)
  async getCurrentStudentAttendanceSummary(
    @Req() request: TokenAuthenticatedRequest,
  ) {
    try {
      return await this.assistanceService.getStudentAttendanceByRut(
        request.user!.rut,
      );
    } catch (e) {
      if (e instanceof StudentNotFoundException) {
        throw new NotFoundException({ error: 'Student not found', rut: e.rut });
      }
      if (e instanceof InvalidRutException) {
        throw new BadRequestException({ error: e.message, rut: e.rut });
      }
      throw e;
    }
  }

  // CU-06 (móvil): clases de las asignaturas inscritas del estudiante del token.
  @Get('students/me/classes')
  @AllowedRoles('estudiante')
  @UseGuards(TokenRolesGuard)
  async getCurrentStudentClasses(@Req() request: TokenAuthenticatedRequest) {
    try {
      return await this.assistanceService.getCurrentStudentClasses(
        request.user!.rut,
      );
    } catch (e) {
      if (e instanceof StudentNotFoundException) {
        throw new NotFoundException({ error: 'Student not found', rut: e.rut });
      }
      throw e;
    }
  }

  // GET /api/v1/students/:rut/assistance?subject=XXX
  // El profesor accede para ubicar los ids de registro que edita en CU-08.
  @Get('students/:rut/assistance')
  @AllowedRoles('estudiante', 'profesor', 'director', 'administrador')
  @UseGuards(TokenRolesGuard)
  async getStudentAssistance(
    @Req() request: TokenAuthenticatedRequest,
    @Param('rut') rut: string,
    @Query('subject') subject: string,
  ) {
    this.assertSameActorOrPrivileged(request, rut);
    try {
      return await this.assistanceService.getStudentAssistance(rut, subject);
    } catch (e) {
      if (e instanceof StudentNotFoundException) {
        throw new NotFoundException({ error: 'Student not found', rut: e.rut });
      }
      throw e;
    }
  }

  // GET /api/v1/students/:rut/attendance — CU-03: asistencia por asignatura
  // Solo Director de carrera o Administrador mediante TokenRolesGuard.
  @Get('students/:rut/attendance')
  @AllowedRoles('director', 'administrador')
  @UseGuards(TokenRolesGuard)
  async getStudentAttendanceByRut(@Param('rut') rut: string) {
    try {
      return await this.assistanceService.getStudentAttendanceByRut(rut);
    } catch (e) {
      if (e instanceof InvalidRutException) {
        throw new BadRequestException({ error: e.message, rut: e.rut });
      }
      if (e instanceof StudentNotFoundException) {
        throw new NotFoundException({ error: 'Student not found', rut: e.rut });
      }
      throw e;
    }
  }

  // CU-04: el RUT se obtiene exclusivamente del token del estudiante.
  @Get('students/me/subjects/:subjectId/attendance')
  @AllowedRoles('estudiante')
  @UseGuards(TokenRolesGuard)
  async getCurrentStudentAttendance(
    @Req() request: TokenAuthenticatedRequest,
    @Param('subjectId') subjectId: string,
  ) {
    try {
      return await this.assistanceService.getCurrentStudentSubjectAttendance(
        request.user!.rut,
        subjectId,
      );
    } catch (e) {
      if (e instanceof StudentNotFoundException) {
        throw new NotFoundException({ error: 'Student not found', rut: e.rut });
      }
      if (e instanceof StudentNotEnrolledException) {
        throw new NotFoundException({
          error: 'Student not enrolled in subject',
          studentRut: e.studentRut,
          subjectCode: e.subjectCode,
        });
      }
      throw e;
    }
  }

  @Post('students/me/classes/:classId/qr')
  @AllowedRoles('estudiante')
  @UseGuards(TokenRolesGuard)
  async generateQr(
    @Req() request: TokenAuthenticatedRequest,
    @Param('classId', ParseIntPipe) classId: number,
  ) {
    try {
      return await this.assistanceService.generateStudentQr(
        request.user!.rut,
        classId,
      );
    } catch (e) {
      if (e instanceof StudentNotFoundException) {
        throw new NotFoundException({ error: 'Student not found', rut: e.rut });
      }
      if (e instanceof ClassNotFoundException) {
        throw new NotFoundException({ error: e.message, classId: e.classId });
      }
      if (e instanceof StudentNotEnrolledException) {
        throw new ForbiddenException({
          error: 'Student not enrolled in subject',
          studentRut: e.studentRut,
          subjectCode: e.subjectCode,
        });
      }
      if (e instanceof RegistrationDisabledException) {
        throw new ConflictException({ error: e.message, classId: e.classId });
      }
      throw e;
    }
  }

  // POST /api/v1/assistance/register
  @Post('assistance/register')
  @UseGuards(ReaderGuard)
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
      if (e instanceof QRAlreadyUsedException) {
        throw new ConflictException({ error: e.message });
      }
      if (e instanceof StudentNotEnrolledException) {
        throw new ForbiddenException({
          error: 'Student not enrolled in subject',
          studentRut: e.studentRut,
          subjectCode: e.subjectCode,
        });
      }
      throw e;
    }
  }

  // GET /api/v1/professors/me/classes — clases que dicta el profesor del token,
  // con sus estados de registro/edición. Apoya CU-07/CU-08: el panel lista los
  // ids en vez de pedir que se escriban a mano.
  @Get('professors/me/classes')
  @AllowedRoles('profesor')
  @UseGuards(TokenRolesGuard)
  async getCurrentProfessorClasses(@Req() request: TokenAuthenticatedRequest) {
    return await this.assistanceService.getCurrentProfessorClasses(
      request.user!.rut,
    );
  }

  // GET /api/v1/professors/:rut/subjects/:code/assistance
  // CU-05: el profesor se obtiene del token, no de un parÃ¡metro del cliente.
  @Get('professors/me/subjects/:code/attendance')
  @AllowedRoles('profesor')
  @UseGuards(TokenRolesGuard)
  async getCurrentProfessorSubjectAttendance(
    @Req() request: TokenAuthenticatedRequest,
    @Param('code') code: string,
  ) {
    try {
      return await this.assistanceService.getStudentsAssistanceBySubject(
        request.user!.rut,
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

  @Get('professors/:rut/subjects/:code/assistance')
  @AllowedRoles('profesor')
  @UseGuards(TokenRolesGuard)
  async getSubjectAssistance(
    @Req() request: TokenAuthenticatedRequest,
    @Param('rut') rut: string,
    @Param('code') code: string,
  ) {
    this.assertSameActor(request, rut);
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

  @Patch('professors/me/classes/:id/registration')
  @AllowedRoles('profesor')
  @UseGuards(TokenRolesGuard)
  async closeCurrentProfessorRegistration(
    @Req() request: TokenAuthenticatedRequest,
    @Param('id', ParseIntPipe) classId: number,
    @Body() dto: UpdateRegistrationStatusDto,
  ) {
    if (dto?.status !== 'DISABLED') {
      throw new BadRequestException({
        error: 'CU-07 only accepts status DISABLED',
      });
    }
    try {
      return await this.assistanceService.disableRegistration(
        request.user!.rut,
        classId,
      );
    } catch (e) {
      this.rethrowClassOperationError(e);
    }
  }

  @Patch('professors/me/classes/:id/editing')
  @AllowedRoles('profesor')
  @UseGuards(TokenRolesGuard)
  async updateCurrentProfessorEditing(
    @Req() request: TokenAuthenticatedRequest,
    @Param('id', ParseIntPipe) classId: number,
    @Body() dto: UpdateEditingStatusDto,
  ) {
    if (dto?.status !== 'ENABLED' && dto?.status !== 'DISABLED') {
      throw new BadRequestException({
        error: 'status must be ENABLED or DISABLED',
      });
    }
    try {
      return dto.status === 'ENABLED'
        ? await this.assistanceService.enableEditing(request.user!.rut, classId)
        : await this.assistanceService.disableEditing(
            request.user!.rut,
            classId,
          );
    } catch (e) {
      this.rethrowClassOperationError(e);
    }
  }

  @Patch('professors/me/assistance/:id')
  @AllowedRoles('profesor')
  @UseGuards(TokenRolesGuard)
  async editCurrentProfessorAssistance(
    @Req() request: TokenAuthenticatedRequest,
    @Param('id', ParseIntPipe) recordId: number,
    @Body() dto: EditAssistanceDto,
  ) {
    if (typeof dto?.present !== 'boolean') {
      throw new BadRequestException({ error: 'present must be a boolean' });
    }
    try {
      return await this.assistanceService.editAssistance(
        request.user!.rut,
        recordId,
        dto.present,
      );
    } catch (e) {
      this.rethrowEditError(e);
    }
  }

  // PATCH /api/v1/professors/:rut/classes/:id/registration — CU-07 / CU-08
  // Body: { "status": "DISABLED" } (CU-07) o { "status": "ENABLED" } (CU-08)
  @Patch('professors/:rut/classes/:id/registration')
  @AllowedRoles('profesor')
  @UseGuards(TokenRolesGuard)
  async updateRegistrationStatus(
    @Req() request: TokenAuthenticatedRequest,
    @Param('rut') professorRut: string,
    @Param('id', ParseIntPipe) classId: number,
    @Body() dto: UpdateRegistrationStatusDto,
  ) {
    this.assertSameActor(request, professorRut);
    if (dto?.status !== 'ENABLED' && dto?.status !== 'DISABLED') {
      throw new BadRequestException({
        error: 'status must be ENABLED or DISABLED',
      });
    }

    try {
      return dto.status === 'DISABLED'
        ? await this.assistanceService.disableRegistration(
            professorRut,
            classId,
          )
        : await this.assistanceService.enableRegistration(
            professorRut,
            classId,
          );
    } catch (e) {
      if (e instanceof ClassNotFoundException) {
        throw new NotFoundException({ error: e.message, classId: e.classId });
      }
      if (e instanceof SubjectNotAssignedException) {
        throw new NotFoundException({
          error: 'Subject not assigned to professor',
          professorRut: e.professorRut,
          subjectCode: e.subjectCode,
        });
      }
      if (e instanceof RegistrationAlreadyDisabledException) {
        throw new ConflictException({ error: e.message, classId: e.classId });
      }
      if (e instanceof RegistrationAlreadyEnabledException) {
        throw new ConflictException({ error: e.message, classId: e.classId });
      }
      throw e;
    }
  }

  // PATCH /api/v1/professors/:rut/assistance/:id — CU-08: editar un registro
  // Body: { "present": true | false }
  @Patch('professors/:rut/assistance/:id')
  @AllowedRoles('profesor')
  @UseGuards(TokenRolesGuard)
  async editAssistance(
    @Req() request: TokenAuthenticatedRequest,
    @Param('rut') professorRut: string,
    @Param('id', ParseIntPipe) recordId: number,
    @Body() dto: EditAssistanceDto,
  ) {
    this.assertSameActor(request, professorRut);
    if (typeof dto?.present !== 'boolean') {
      throw new BadRequestException({ error: 'present must be a boolean' });
    }

    try {
      return await this.assistanceService.editAssistance(
        professorRut,
        recordId,
        dto.present,
      );
    } catch (e) {
      if (e instanceof AssistanceRecordNotFoundException) {
        throw new NotFoundException({ error: e.message, recordId: e.recordId });
      }
      if (e instanceof SubjectNotAssignedException) {
        throw new NotFoundException({
          error: 'Subject not assigned to professor',
          professorRut: e.professorRut,
          subjectCode: e.subjectCode,
        });
      }
      if (e instanceof EditingDisabledException) {
        throw new ConflictException({ error: e.message, classId: e.classId });
      }
      if (e instanceof ClassNotFoundException) {
        throw new NotFoundException({ error: e.message, classId: e.classId });
      }
      throw e;
    }
  }

  private rethrowClassOperationError(error: unknown): never {
    if (error instanceof ClassNotFoundException) {
      throw new NotFoundException({
        error: error.message,
        classId: error.classId,
      });
    }
    if (error instanceof SubjectNotAssignedException) {
      throw new NotFoundException({
        error: 'Subject not assigned to professor',
        professorRut: error.professorRut,
        subjectCode: error.subjectCode,
      });
    }
    if (
      error instanceof RegistrationAlreadyDisabledException ||
      error instanceof RegistrationAlreadyEnabledException ||
      error instanceof EditingAlreadyEnabledException ||
      error instanceof EditingAlreadyDisabledException ||
      error instanceof RegistrationMustBeDisabledException
    ) {
      throw new ConflictException({
        error: error.message,
        classId: error.classId,
      });
    }
    throw error;
  }

  private assertSameActor(
    request: TokenAuthenticatedRequest,
    requestedRut: string,
  ): void {
    if (request.user!.rut !== requestedRut) {
      throw new ForbiddenException('No puede actuar en nombre de otro usuario');
    }
  }

  private assertSameActorOrPrivileged(
    request: TokenAuthenticatedRequest,
    requestedRut: string,
  ): void {
    if (
      request.user!.role === 'estudiante' &&
      request.user!.rut !== requestedRut
    ) {
      throw new ForbiddenException('No puede consultar a otro estudiante');
    }
  }

  private rethrowEditError(error: unknown): never {
    if (error instanceof AssistanceRecordNotFoundException) {
      throw new NotFoundException({
        error: error.message,
        recordId: error.recordId,
      });
    }
    if (error instanceof ClassNotFoundException) {
      throw new NotFoundException({
        error: error.message,
        classId: error.classId,
      });
    }
    if (error instanceof SubjectNotAssignedException) {
      throw new NotFoundException({
        error: 'Subject not assigned to professor',
        professorRut: error.professorRut,
        subjectCode: error.subjectCode,
      });
    }
    if (error instanceof EditingDisabledException) {
      throw new ConflictException({
        error: error.message,
        classId: error.classId,
      });
    }
    throw error;
  }
}
