import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  NotFoundException,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiCreatedResponse, ApiTags } from '@nestjs/swagger';
import { RegisterUserDto } from './application/register-user.dto';
import { RegisterUserService } from './application/register-user.service';
import {
  InstitutionalUserNotFoundError,
  InvalidRutFormatError,
  InvalidInstitutionalCredentialsError,
  RoleNotAllowedError,
  RutRequiredError,
  UserAlreadyRegisteredError,
} from './domain/user-registration.errors';
import {
  AllowedRoles,
  TokenRolesGuard,
} from '../auth/application/token-roles.guard';

@ApiTags('Registro de usuarios')
@Controller('api/v1/users')
export class UsersController {
  constructor(private readonly registerUserService: RegisterUserService) {}

  @Post('register')
  @AllowedRoles('administrador')
  @UseGuards(TokenRolesGuard)
  @ApiCreatedResponse({ description: 'Cuenta institucional creada' })
  async register(@Body() dto: RegisterUserDto) {
    try {
      return await this.registerUserService.execute(dto);
    } catch (error) {
      if (error instanceof InvalidInstitutionalCredentialsError) {
        throw new BadRequestException({ error: error.message });
      }
      if (error instanceof InvalidRutFormatError) {
        throw new BadRequestException({ error: error.message, rut: error.rut });
      }
      if (error instanceof RutRequiredError) {
        throw new BadRequestException({ error: error.message });
      }
      if (error instanceof RoleNotAllowedError) {
        throw new BadRequestException({
          error: error.message,
          role: error.role,
        });
      }
      if (error instanceof InstitutionalUserNotFoundError) {
        throw new NotFoundException({ error: error.message, rut: error.rut });
      }
      if (error instanceof UserAlreadyRegisteredError) {
        throw new ConflictException({ error: error.message, rut: error.rut });
      }
      throw error;
    }
  }
}
