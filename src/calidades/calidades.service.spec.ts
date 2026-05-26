import { Test, TestingModule } from '@nestjs/testing';
import { CalidadesService } from './calidades.service';

describe('CalidadesService', () => {
  let service: CalidadesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CalidadesService],
    }).compile();

    service = module.get<CalidadesService>(CalidadesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
