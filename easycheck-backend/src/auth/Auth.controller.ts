import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './Auth.service';
import type { LoginDto } from './Auth.service';
import {
  EmptyCredentialsException,
  InvalidRutFormatException,
  AccountDisabledException,
  InvalidCredentialsException,
} from './domain/auth.errors';

@Controller('api/v1/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto) {
    try {
      return await this.authService.login(dto);
    } catch (e) {
      if (e instanceof EmptyCredentialsException) {
        throw new BadRequestException({ message: e.message, fields: e.fields });
      }
      if (e instanceof InvalidRutFormatException) {
        throw new BadRequestException({ message: e.message });
      }
      if (e instanceof AccountDisabledException) {
        throw new ForbiddenException({ message: e.message });
      }
      if (e instanceof InvalidCredentialsException) {
        throw new UnauthorizedException({ message: e.message });
      }
      throw e;
    }
  }
}
