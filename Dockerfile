# Etapa de construcción
FROM node:20-alpine AS builder

WORKDIR /app

# 👇 Recibimos DIRECT_URL como argumento de construcción
ARG DIRECT_URL
ENV DIRECT_URL=$DIRECT_URL

# Copiamos dependencias y los archivos de Prisma (incluyendo prisma.config.ts)
COPY package*.json ./
COPY prisma ./prisma/

# Instalamos dependencias (incluye devDependencies para compilar)
RUN npm ci

# Generamos el cliente de Prisma (necesita DIRECT_URL)
RUN npx prisma generate

# Copiamos el resto del código fuente (incluye prisma.config.ts ya copiado)
COPY . .

# Compilamos la aplicación (genera dist/)
RUN npm run build

# --------------------------------------------
# Etapa de producción (imagen final liviana)
FROM node:20-alpine

WORKDIR /app

# Copiamos solo lo necesario
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package*.json ./
# También copiamos el prisma.config.ts si quieres tenerlo (aunque no es estrictamente necesario en runtime, pero por si acaso)
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts

EXPOSE 4000
CMD ["node", "dist/main"]