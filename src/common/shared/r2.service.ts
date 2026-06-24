import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    S3Client,
    PutObjectCommand,
    S3ServiceException,
} from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';

@Injectable()
export class R2Service {
    private s3Client: S3Client;
    private bucketName: string;
    private publicUrl: string;

    constructor(private configService: ConfigService) {
        const accountId = this.configService.get<string>('R2_ACCOUNT_ID');
        const accessKeyId = this.configService.get<string>('R2_ACCESS_KEY_ID');
        const secretAccessKey = this.configService.get<string>(
            'R2_SECRET_ACCESS_KEY',
        );
        const bucketName = this.configService.get<string>('R2_BUCKET_NAME');
        const publicUrl = this.configService.get<string>('R2_PUBLIC_URL');

        if (
            !accountId ||
            !accessKeyId ||
            !secretAccessKey ||
            !bucketName ||
            !publicUrl
        ) {
            throw new InternalServerErrorException(
                'Faltan variables de entorno para R2.',
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

    async uploadFile(
        file: Express.Multer.File,
        folder: string = 'incidencias',
    ): Promise<string> {
        try {
            const key = `${folder}/${randomUUID()}-${file.originalname}`;

            const command = new PutObjectCommand({
                Bucket: this.bucketName,
                Key: key,
                Body: file.buffer,
                ContentType: file.mimetype,
            });

            await this.s3Client.send(command);

            return `${this.publicUrl}/${key}`;
        } catch (error: unknown) {
            console.error(error);

            const message =
                error instanceof Error ? error.message : 'Error desconocido';

            throw new InternalServerErrorException(
                `Error al subir archivo a R2: ${message}`,
            );
        }
    }

    async uploadMultiple(
        files: Express.Multer.File[],
        folder: string = 'incidencias',
    ): Promise<string[]> {
        const urls: string[] = [];

        for (const file of files) {
            const url = await this.uploadFile(file, folder);
            urls.push(url);
        }

        return urls;
    }
}