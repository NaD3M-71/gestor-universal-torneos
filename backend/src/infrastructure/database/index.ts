import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './prisma/client'; // Apuntando a tu cliente generado

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

const createPrismaClient = () => {
  const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL,
    max: process.env.NODE_ENV === 'production' ? 1 : 10,
    idleTimeoutMillis: 60000,
    connectionTimeoutMillis: 10000,
  });
  const adapter = new PrismaPg(pool);

  return new PrismaClient({
    adapter: adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  }); 
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;


/**
 * ============================================================================
 * GUÍA RÁPIDA DE USO DE PRISMA PARA EL EQUIPO
 * ============================================================================
 * 
 * COMANDOS PRINCIPALES (Ejecutar en el directorio /backend):
 * 
 * 1. npx prisma db pull
 *    - ¿Qué hace?: Lee las tablas y relaciones existentes en Supabase y
 *      actualiza automáticamente el archivo 'prisma/schema.prisma'.
 *    - ¿Cuándo usarlo?: Cada vez que crees o modifiques una tabla/columna
 *      desde la interfaz de Supabase.
 * 
 * 2. npx prisma generate
 *    - ¿Qué hace?: Reconstruye el cliente de TypeScript (@prisma/client).
 *      Genera interfaces e Inferencia de Tipos exacta en base al schema.
 *    - ¿Cuándo usarlo?: Inmediatamente después de hacer 'db pull' o si
 *      alguien del equipo modificó el schema y clonaste el repositorio.
 * 
 * 3. npx prisma studio
 *    - ¿Qué hace?: Abre un panel visual interactivo en el navegador 
 *      (http://localhost:5555) para ver, editar y crear datos localmente.
 * 
 */