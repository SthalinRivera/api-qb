import { Test, TestingModule } from '@nestjs/testing';
import { CamionesController } from './camiones.controller';
import { CamionesService } from './camiones.service';

describe('CamionesController', () => {
  let controller: CamionesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CamionesController],
      providers: [CamionesService],
    }).compile();

    controller = module.get<CamionesController>(CamionesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
