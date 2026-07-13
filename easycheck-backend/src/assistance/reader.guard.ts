import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

@Injectable()
export class ReaderGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | undefined>;
    }>();
    const expected = process.env.READER_API_KEY ?? 'easycheck-local-reader-key';
    if (request.headers['x-reader-key'] !== expected) {
      throw new UnauthorizedException('Credencial de lector invÃ¡lida');
    }
    return true;
  }
}
