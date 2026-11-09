-- =============================================================================
-- Gestor Universal de Torneos
-- Script 2: creación de tipos, tablas y relaciones
-- =============================================================================
-- Ejecutar sobre la base creada con 01_crear_base.sql:
--
--   psql -U postgres -d gestor_torneos -f 02_crear_tablas.sql
--
-- Equivale al esquema de Prisma (backend/src/infrastructure/database/schema/
-- schema.prisma). Si el esquema cambia, este script se actualiza.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- Tipos enumerados
-- -----------------------------------------------------------------------------

-- Ciclo de vida del torneo
CREATE TYPE "EstadoTorneo" AS ENUM ('borrador', 'en_curso', 'finalizado');

-- Formato de competencia
CREATE TYPE "FormatoTorneo" AS ENUM (
    'liga_simple',
    'liga_doble',
    'eliminacion_simple',
    'eliminacion_doble',
    'liguilla_eliminacion',
    'grupos_eliminatorias'
);

-- Sistema de puntuación de las tablas de posiciones
CREATE TYPE "SistemaPuntuacion" AS ENUM (
    'ganada_perdida',
    'futbol_clasico',
    'sistema_alternativo'
);


-- -----------------------------------------------------------------------------
-- Tablas
-- -----------------------------------------------------------------------------

-- Organizadores registrados
CREATE TABLE "usuarios" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "apellido" VARCHAR(100) NOT NULL,
    "email" VARCHAR(150) NOT NULL,
    "contrasena" VARCHAR(255) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- Configuración general de cada torneo
CREATE TABLE "torneos" (
    "id" SERIAL NOT NULL,
    "creador_id" INTEGER NOT NULL,
    "nombre" VARCHAR(150) NOT NULL,
    "descripcion" TEXT,
    "formato" "FormatoTorneo" NOT NULL,
    "sistema_puntuacion" "SistemaPuntuacion" NOT NULL,
    "cantidad_participantes" INTEGER NOT NULL,
    "cantidad_grupos" INTEGER,
    "fecha_inicio" DATE,
    "estado" "EstadoTorneo" NOT NULL DEFAULT 'borrador',
    "campeon_id" INTEGER,

    CONSTRAINT "torneos_pkey" PRIMARY KEY ("id")
);

-- Etapas de un torneo (liga, grupos, eliminación)
CREATE TABLE "fases" (
    "id" SERIAL NOT NULL,
    "torneo_id" INTEGER NOT NULL,
    "tipo" VARCHAR(50) NOT NULL,
    "orden" INTEGER NOT NULL,
    "estado" VARCHAR(20) NOT NULL DEFAULT 'activa',
    "linea_de_corte" INTEGER,
    "ida_y_vuelta" BOOLEAN NOT NULL DEFAULT false,
    "comentario_desempate" TEXT,

    CONSTRAINT "fases_pkey" PRIMARY KEY ("id")
);

-- Participantes inscriptos en un torneo (equipo o jugador individual)
CREATE TABLE "equipos" (
    "id" SERIAL NOT NULL,
    "torneo_id" INTEGER NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "grupo" INTEGER,
    "ventaja_desempate" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "equipos_pkey" PRIMARY KEY ("id")
);

-- Personas que integran un equipo (opcional)
CREATE TABLE "integrantes" (
    "id" SERIAL NOT NULL,
    "equipo_id" INTEGER NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,

    CONSTRAINT "integrantes_pkey" PRIMARY KEY ("id")
);

-- Partidos y cruces de cada fase
CREATE TABLE "enfrentamientos" (
    "id" SERIAL NOT NULL,
    "fase_id" INTEGER NOT NULL,
    "equipo_a_id" INTEGER,
    "equipo_b_id" INTEGER,
    "resultado_a" INTEGER,
    "resultado_b" INTEGER,
    "instancia" VARCHAR(50),
    "siguiente_id" INTEGER,
    "vuelta_de_id" INTEGER,
    "ganador_id" INTEGER,
    "comentario" VARCHAR(255),

    CONSTRAINT "enfrentamientos_pkey" PRIMARY KEY ("id")
);


-- -----------------------------------------------------------------------------
-- Índices
-- -----------------------------------------------------------------------------

-- El email es la credencial de acceso: no se puede repetir
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");


-- -----------------------------------------------------------------------------
-- Relaciones (claves foráneas)
-- -----------------------------------------------------------------------------

-- Un torneo pertenece a un usuario organizador
ALTER TABLE "torneos" ADD CONSTRAINT "torneos_creador_id_fkey"
    FOREIGN KEY ("creador_id") REFERENCES "usuarios"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- Un torneo finalizado apunta al equipo campeón
ALTER TABLE "torneos" ADD CONSTRAINT "torneos_campeon_id_fkey"
    FOREIGN KEY ("campeon_id") REFERENCES "equipos"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- Al borrar un torneo se borran sus fases
ALTER TABLE "fases" ADD CONSTRAINT "fases_torneo_id_fkey"
    FOREIGN KEY ("torneo_id") REFERENCES "torneos"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- Al borrar un torneo se borran sus equipos
ALTER TABLE "equipos" ADD CONSTRAINT "equipos_torneo_id_fkey"
    FOREIGN KEY ("torneo_id") REFERENCES "torneos"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- Al borrar un equipo se borran sus integrantes
ALTER TABLE "integrantes" ADD CONSTRAINT "integrantes_equipo_id_fkey"
    FOREIGN KEY ("equipo_id") REFERENCES "equipos"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- Al borrar una fase se borran sus enfrentamientos
ALTER TABLE "enfrentamientos" ADD CONSTRAINT "enfrentamientos_fase_id_fkey"
    FOREIGN KEY ("fase_id") REFERENCES "fases"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- Los dos competidores y el ganador de cada partido son equipos
ALTER TABLE "enfrentamientos" ADD CONSTRAINT "enfrentamientos_equipo_a_id_fkey"
    FOREIGN KEY ("equipo_a_id") REFERENCES "equipos"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "enfrentamientos" ADD CONSTRAINT "enfrentamientos_equipo_b_id_fkey"
    FOREIGN KEY ("equipo_b_id") REFERENCES "equipos"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "enfrentamientos" ADD CONSTRAINT "enfrentamientos_ganador_id_fkey"
    FOREIGN KEY ("ganador_id") REFERENCES "equipos"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- Encadenamiento del fixture: a qué cruce avanza el ganador
ALTER TABLE "enfrentamientos" ADD CONSTRAINT "enfrentamientos_siguiente_id_fkey"
    FOREIGN KEY ("siguiente_id") REFERENCES "enfrentamientos"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- Partido de vuelta: apunta al partido de ida de la misma serie
ALTER TABLE "enfrentamientos" ADD CONSTRAINT "enfrentamientos_vuelta_de_id_fkey"
    FOREIGN KEY ("vuelta_de_id") REFERENCES "enfrentamientos"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
