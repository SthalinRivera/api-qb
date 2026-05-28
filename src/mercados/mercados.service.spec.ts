import { Test, TestingModule } from '@nestjs/testing';
import { MercadosService } from './mercados.service';

describe('MercadosService', () => {
  let service: MercadosService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MercadosService],
    }).compile();

    service = module.get<MercadosService>(MercadosService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
