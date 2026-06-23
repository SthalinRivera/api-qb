// src/modules/incidencias/incidencias.service.ts
import { BadRequestException, Injectable, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma/prisma.service';
import { R2Service } from '../../common/shared/r2.service';
import { CreateIncidenciaDto } from './dto/create-incidencia.dto';
import { UpdateIncidenciaDto } from './dto/update-incidencia.dto';
import { evidencias } from '@prisma/client';

type Evidencia = evidencias;

@Injectable()
export class IncidenciasService {
  constructor(
    private prisma: PrismaService,
    private r2Service: R2Service,
  ) {}

  // ============================================================
  // CREAR incidencia CON EVIDENCIAS (archivos subidos a R2)
  // ============================================================
  async createWithEvidencias(
    createIncidenciaDto: CreateIncidenciaDto,
    files: Express.Multer.File[],
    idUsuario: number,
  ) {
    console.log('🚀 Iniciando creación de incidencia con evidencias...');
    console.log('📥 DTO recibido:', JSON.stringify(createIncidenciaDto, null, 2));
    console.log('📎 Archivos recibidos:', files?.length || 0);

    // 1. Obtener usuario
    const usuario = await this.prisma.usuarios.findUnique({
      where: { id_usuario: BigInt(idUsuario) },
      select: { id_empresa: true },
    });

    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }
    console.log(`👤 Usuario encontrado: id=${idUsuario}, id_empresa=${usuario.id_empresa}`);

    // 2. Extraer id_empresa y otros campos
    const { id_empresa, ...restDto } = createIncidenciaDto;

    // 3. Convertir fecha_incidencia (string -> Date)
    const fechaDate = new Date(restDto.fecha_incidencia);
    if (isNaN(fechaDate.getTime())) {
      throw new BadRequestException('Fecha inválida');
    }
    console.log(`📅 Fecha convertida: ${fechaDate.toISOString()}`);

    // 4. Convertir hora_incidencia (string "HH:MM" -> Date) si existe
    let horaDate: Date | undefined = undefined;
    if (restDto.hora_incidencia) {
      const parts = restDto.hora_incidencia.split(':');
      if (parts.length === 2) {
        horaDate = new Date(`1970-01-01T${restDto.hora_incidencia}:00`);
      } else if (parts.length === 3) {
        horaDate = new Date(`1970-01-01T${restDto.hora_incidencia}`);
      } else {
        throw new BadRequestException('Formato de hora inválido (usa HH:MM o HH:MM:SS)');
      }
      if (isNaN(horaDate.getTime())) {
        throw new BadRequestException('Hora inválida');
      }
      console.log(`🕐 Hora convertida: ${horaDate.toISOString()}`);
    }

    // 5. Construir datos para Prisma (sin undefined)
    const dataConEmpresa: any = {
      fecha_incidencia: fechaDate,
      tipo_incidencia: restDto.tipo_incidencia,
      descripcion: restDto.descripcion,
      id_empresa: Number(usuario.id_empresa),
      id_usuario_reporta: idUsuario,
      estado: restDto.estado || 'abierta',
    };

    if (restDto.id_operacion !== undefined) dataConEmpresa.id_operacion = restDto.id_operacion;
    if (restDto.id_guia !== undefined) dataConEmpresa.id_guia = restDto.id_guia;
    if (restDto.id_entrega !== undefined) dataConEmpresa.id_entrega = restDto.id_entrega;
    if (restDto.accion_tomada !== undefined) dataConEmpresa.accion_tomada = restDto.accion_tomada;
    if (horaDate !== undefined) dataConEmpresa.hora_incidencia = horaDate;

    console.log('📦 Datos a insertar en incidencias:', JSON.stringify(dataConEmpresa, null, 2));

    // 6. Crear la incidencia
    let incidencia;
    try {
      incidencia = await this.prisma.incidencias.create({
        data: dataConEmpresa,
      });
      console.log(`✅ Incidencia creada con ID: ${incidencia.id_incidencia}`);
    } catch (error) {
      console.error('❌ Error al crear incidencia:', error);
      throw new InternalServerErrorException('Error al crear la incidencia');
    }

    // 7. Subir archivos y registrar evidencias (si hay)
    const evidenciasCreadas: Evidencia[] = [];
    if (files && files.length > 0) {
      console.log(`📤 Subiendo ${files.length} archivo(s) a R2...`);
      try {
        const urls = await this.r2Service.uploadMultiple(files, 'incidencias');
        console.log(`✅ URLs generadas: ${urls.length}`);
        console.log('📋 URLs:', urls);

        for (const url of urls) {
          const evidencia = await this.prisma.evidencias.create({
            data: {
              id_empresa: incidencia.id_empresa,
              tipo_entidad: 'incidencia',
              id_entidad: incidencia.id_incidencia,
              url_archivo: url,
              tipo_archivo: 'image',
              subido_por: idUsuario || null,
            },
          });
          evidenciasCreadas.push(evidencia);
          console.log(`✅ Evidencia guardada: id=${evidencia.id_evidencia}, url=${url}`);
        }
      } catch (error) {
        console.error('❌ Error al subir archivos o guardar evidencias:', error);
        // No lanzamos error para no perder la incidencia, pero registramos el error
        // Podrías lanzar una excepción si quieres que falle toda la operación
      }
    } else {
      console.log('ℹ️ No hay archivos para subir');
    }

    // 8. Devolver la incidencia con sus evidencias
    const resultado = {
      ...incidencia,
      evidencias: evidenciasCreadas,
    };
    console.log('🎉 Incidencia creada exitosamente con evidencias:', resultado);
    return resultado;
  }

  // ============================================================
  // OBTENER TODAS las incidencias con sus evidencias
  // ============================================================
  async findAll() {
    console.log('📋 Obteniendo todas las incidencias...');
    const incidencias = await this.prisma.incidencias.findMany({
      include: {
        empresas: true,
        usuarios: true,
      },
    });

    const ids = incidencias.map(i => i.id_incidencia);
    const evidencias = await this.prisma.evidencias.findMany({
      where: {
        tipo_entidad: 'incidencia',
        id_entidad: { in: ids },
      },
    });

    const evidenciasPorIncidencia = new Map<number, Evidencia[]>();
    for (const ev of evidencias) {
      const key = Number(ev.id_entidad);
      if (!evidenciasPorIncidencia.has(key)) {
        evidenciasPorIncidencia.set(key, []);
      }
      evidenciasPorIncidencia.get(key)!.push(ev);
    }

    return incidencias.map(inc => {
      const incidenciaId = Number(inc.id_incidencia);
      const evidenciasDeIncidencia = evidenciasPorIncidencia.get(incidenciaId) || [];
      return {
        ...inc,
        evidencias: evidenciasDeIncidencia,
      };
    });
  }

  // ============================================================
  // OBTENER una incidencia por ID con sus evidencias
  // ============================================================
  async findOne(id: number) {
    console.log(`🔍 Buscando incidencia con ID: ${id}`);
    const incidencia = await this.prisma.incidencias.findUnique({
      where: { id_incidencia: BigInt(id) },
      include: {
        empresas: true,
        usuarios: true,
        entregas: true,
        guias_operativas: true,
        operaciones_carga: true,
      },
    });

    if (!incidencia) return null;

    const evidencias = await this.prisma.evidencias.findMany({
      where: {
        tipo_entidad: 'incidencia',
        id_entidad: incidencia.id_incidencia,
      },
    });

    return {
      ...incidencia,
      evidencias,
    };
  }

  // ============================================================
  // ACTUALIZAR incidencia (solo datos, sin archivos)
  // ============================================================
  async update(id: number, updateIncidenciaDto: UpdateIncidenciaDto) {
    console.log(`🔄 Actualizando incidencia ID: ${id}`);
    return this.prisma.incidencias.update({
      where: { id_incidencia: BigInt(id) },
      data: updateIncidenciaDto,
    });
  }

  // ============================================================
  // ELIMINAR incidencia y sus evidencias asociadas
  // ============================================================
  async remove(id: number) {
    console.log(`🗑️ Eliminando incidencia ID: ${id}`);
    await this.prisma.evidencias.deleteMany({
      where: {
        tipo_entidad: 'incidencia',
        id_entidad: BigInt(id),
      },
    });
    return this.prisma.incidencias.delete({
      where: { id_incidencia: BigInt(id) },
    });
  }
}