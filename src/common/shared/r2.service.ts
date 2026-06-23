import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, S3ServiceException } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class R2Service {
    private s3Client: S3Client;
    private bucketName: string;
    private publicUrl: string;

    constructor(private configService: ConfigService) {
        // Obtener variables de entorno y validar que existan
        const accountId = this.configService.get<string>('R2_ACCOUNT_ID');
        const accessKeyId = this.configService.get<string>('R2_ACCESS_KEY_ID');
        const secretAccessKey = this.configService.get<string>('R2_SECRET_ACCESS_KEY');
        const bucketName = this.configService.get<string>('R2_BUCKET_NAME');
        const publicUrl = this.configService.get<string>('R2_PUBLIC_URL');

        console.log('🔐 R2 Config:', {
            accountId: accountId ? '✅' : '❌',
            accessKeyId: accessKeyId ? '✅' : '❌',
            secretAccessKey: secretAccessKey ? '✅' : '❌',
            bucketName: bucketName ? '✅' : '❌',
            publicUrl: publicUrl ? '✅' : '❌'
        });

        if (!accountId || !accessKeyId || !secretAccessKey || !bucketName || !publicUrl) {
            throw new InternalServerErrorException(
                'Faltan variables de entorno para R2. Verifica: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL'
            );
        }

        this.bucketName = bucketName;
        this.publicUrl = publicUrl;

        this.s3Client = new S3Client({
            region: 'auto',
            endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
            credentials: {
                accessKeyId,
                secretAccessKey,
            },
        });
        console.log('✅ Cliente R2 inicializado correctamente');
    }

    async uploadFile(file: Express.Multer.File, folder: string = 'incidencias'): Promise<string> {
        try {
            console.log(`📤 Subiendo archivo: ${file.originalname}, tamaño: ${file.size} bytes, tipo: ${file.mimetype}`);

            const key = `${folder}/${uuidv4()}-${file.originalname}`;
            console.log(`🔑 Clave generada: ${key}`);

            const command = new PutObjectCommand({
                Bucket: this.bucketName,
                Key: key,
                Body: file.buffer,
                ContentType: file.mimetype,
                ACL: 'public-read',
            });

            console.log(`🚀 Enviando a R2...`);
            const response = await this.s3Client.send(command);
            console.log(`✅ Subida exitosa. ETag: ${response.ETag}`);

            const url = `${this.publicUrl}/${key}`;
            console.log(`🌐 URL pública: ${url}`);

            return url;
        } catch (error) {
            console.error('❌ Error al subir archivo a R2:', error);
            if (error instanceof S3ServiceException) {
                console.error('🔍 Detalles S3:', {
                    name: error.name,
                    message: error.message,
                    statusCode: error.$metadata?.httpStatusCode,
                });
            }
            throw new InternalServerErrorException(`Error al subir archivo a R2: ${error.message}`);
        }
    }

    async uploadMultiple(files: Express.Multer.File[], folder: string = 'incidencias'): Promise<string[]> {
        console.log(`📦 Subiendo ${files.length} archivos a la carpeta ${folder}`);
        const urls: string[] = [];
        for (let i = 0; i < files.length; i++) {
            try {
                console.log(`⏳ Procesando archivo ${i + 1}/${files.length}`);
                const url = await this.uploadFile(files[i], folder);
                urls.push(url);
            } catch (error) {
                console.error(`❌ Falló la subida del archivo ${i + 1}:`, error);
                // Lanzamos el error para que el proceso principal lo maneje
                throw error;
            }
        }
        console.log(`✅ Todos los archivos subidos exitosamente. URLs: ${urls.length}`);
        return urls;
    }
}