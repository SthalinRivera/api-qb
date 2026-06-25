FROM node:20-alpine

WORKDIR /app

# 1. Copiar solo los archivos de dependencias
COPY package*.json ./

# 2. Instalar dependencias
RUN npm install

# 3. Copiar el esquema de Prisma (necesario para generar el cliente)
COPY prisma ./prisma

# 4. (NUEVO) Generar el cliente de Prisma
RUN npx prisma generate

# 5. Copiar el resto del código (incluye src, etc.)
COPY . .

# 6. Ahora compilar NestJS (ya conoce los tipos de Prisma)
RUN npm run build

# 7. Exponer el puerto
EXPOSE 4000

# 8. Comando de inicio (ya no hace falta prisma generate)
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]