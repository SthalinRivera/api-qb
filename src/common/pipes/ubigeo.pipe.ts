import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
@Injectable()
export class UbigeoPipe implements PipeTransform<string, string> {
  transform(value: string) {
    if (!/^\d{6}$/.test(value)) throw new BadRequestException('El ubigeo debe tener seis dígitos.');
    return value;
  }
}
