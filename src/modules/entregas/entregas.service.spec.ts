import { Test, TestingModule } from '@nestjs/testing';
import { EntregasService } from './entregas.service';

describe('EntregasService', () => {
  let service: EntregasService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EntregasService],
    }).compile();

    service = module.get<EntregasService>(EntregasService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
