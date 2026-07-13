import { AssistanceService } from '../../src/assistance/Assistance.service';
import { DataRepository } from '../../src/assistance/Data.repository';
import { QrTokenService } from '../../src/assistance/qr-token.service';

export function createAssistanceContext(): {
  data: DataRepository;
  service: AssistanceService;
} {
  const data = new DataRepository();
  return {
    data,
    service: new AssistanceService(data, new QrTokenService()),
  };
}
