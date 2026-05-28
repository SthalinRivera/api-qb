import { Test, TestingModule } from '@nestjs/testing';
import { MercadosController } from './mercados.controller';
import { MercadosService } from './mercados.service';

describe('MercadosController', () => {
  let controller: MercadosController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MercadosController],
      providers: [MercadosService],
    }).compile();

    controller = module.get<MercadosController>(MercadosController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
