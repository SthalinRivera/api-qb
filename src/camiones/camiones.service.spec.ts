import { Test, TestingModule } from '@nestjs/testing';
import { CamionesService } from './camiones.service';

describe('CamionesService', () => {
  let service: CamionesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CamionesService],
    }).compile();

    service = module.get<CamionesService>(CamionesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
