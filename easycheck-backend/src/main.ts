import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { validateRuntimeEnvironment } from './config/environment';

async function bootstrap() {
  validateRuntimeEnvironment();
  const app = await NestFactory.create(AppModule);
  // La app móvil (y flutter run -d chrome) consume la API desde otro origen;
  // el panel web sigue pasando por el proxy de Vite sin verse afectado.
  app.enableCors();

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('EasyCheck API')
    .setDescription('Backend NestJS para EasyCheck UFRO')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
