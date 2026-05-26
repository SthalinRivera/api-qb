import { Test, TestingModule } from '@nestjs/testing';
import { CalidadesController } from './calidades.controller';
import { CalidadesService } from './calidades.service';

describe('CalidadesController', () => {
  let controller: CalidadesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CalidadesController],
      providers: [CalidadesService],
    }).compile();

    controller = module.get<CalidadesController>(CalidadesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
