import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { SubjectService } from './Subject.service';
import type { CreateSubjectDto } from './Subject.service';
import { Subject } from './Subject.repository';
import {
  AllowedRoles,
  TokenRolesGuard,
} from '../auth/application/token-roles.guard';
import {
  MissingFieldsException,
  InvalidFieldFormatException,
  SubjectAlreadyExistsException,
} from '../common/exceptions';

@Controller('api/v1/subjects')
export class SubjectController {
  constructor(private readonly subjectService: SubjectService) {}

  @Post()
  @AllowedRoles('administrador')
  @UseGuards(TokenRolesGuard)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateSubjectDto,
  ): Promise<{ message: string; subject: Subject }> {
    try {
      return await this.subjectService.createSubject(dto);
    } catch (e) {
      if (e instanceof MissingFieldsException) {
        throw new BadRequestException({ message: e.message, fields: e.fields });
      }
      if (e instanceof InvalidFieldFormatException) {
        throw new BadRequestException({ message: e.message, field: e.field });
      }
      if (e instanceof SubjectAlreadyExistsException) {
        throw new ConflictException({ message: e.message, code: e.code });
      }
      throw e;
    }
  }
}
