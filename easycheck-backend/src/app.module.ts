import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AssistanceModule } from './assistance/Assistance.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/Auth.module';
import { SubjectModule } from './subject/Subject.module';
import { TestSeedModule } from './test-seed/test-seed.module';

// El endpoint de seed sólo se monta fuera de producción.
const testOnlyModules =
  process.env.NODE_ENV === 'production' ? [] : [TestSeedModule];

@Module({
  imports: [
    AssistanceModule,
    UsersModule,
    AuthModule,
    SubjectModule,
    ...testOnlyModules,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
