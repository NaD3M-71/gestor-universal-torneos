import { prisma } from '../src/infrastructure/database';
import bcrypt from 'bcryptjs'; 

async function main() {
  console.log('🌱 Iniciando la siembra de datos (seeder completo)...');

  // Limpiar la base de datos en orden inverso para respetar claves foráneas
  await prisma.enfrentamiento.deleteMany();
  await prisma.integrante.deleteMany();
  await prisma.equipo.deleteMany();
  await prisma.fase.deleteMany();
  await prisma.torneo.deleteMany();
  await prisma.usuario.deleteMany();

  console.log('Base de datos limpia.');

  // Hashear una contraseña real para el test (ej: "12345678")
  const hashedPassword = await bcrypt.hash('12345678', 10);

  // Crear un Usuario Organizador con el hash real
  const organizador = await prisma.usuario.create({
    data: {
      nombre: 'Valeria',
      apellido: 'Giménez',
      email: 'valeria.organizador@test.com',
      contrasenia: hashedPassword, // <-- Usar el hash real de bcrypt
    },
  });
  console.log(`👤 Usuario creado: ${organizador.email} (ID: ${organizador.id})`);

  // ==========================================
  // 2. TORNEO EN CURSO (Activo)
  // ==========================================
  const torneoActivo = await prisma.torneo.create({
    data: {
      creadorId: organizador.id,
      nombre: 'Torneo Relámpago F5 - Primavera',
      descripcion: 'Torneo activo para validar la gestión de partidos.',
      formato: 'liga_simple',
      sistemaPuntuacion: 'futbol_clasico',
      cantidadParticipantes: 4,
      estado: 'en_curso',
      fechaInicio: new Date(),
    },
  });

  const eqActivo1 = await prisma.equipo.create({ data: { torneoId: torneoActivo.id, nombre: 'Los Picapiedras' } });
  const eqActivo2 = await prisma.equipo.create({ data: { torneoId: torneoActivo.id, nombre: 'Dep. Akdemicos' } });
  
  const faseActiva = await prisma.fase.create({
    data: { torneoId: torneoActivo.id, tipo: 'liga', orden: 1, estado: 'activa', idaYVuelta: false },
  });

  await prisma.enfrentamiento.create({
    data: {
      faseId: faseActiva.id,
      equipoAId: eqActivo1.id,
      equipoBId: eqActivo2.id,
      instancia: 'fecha_1',
      resultadoA: 2,
      resultadoB: 1,
    },
  });

  // ==========================================
  // 3. TORNEO EN BORRADOR
  // ==========================================
  await prisma.torneo.create({
    data: {
      creadorId: organizador.id,
      nombre: 'Copa de Verano 2026 (Borrador)',
      descripcion: 'Torneo en configuración inicial, pendiente de inscripción de equipos.',
      formato: 'eliminacion_simple',
      sistemaPuntuacion: 'ganada_perdida',
      cantidadParticipantes: 8,
      estado: 'borrador',
    },
  });

  // ==========================================
  // 4. TORNEO FINALIZADO (Con Campeón)
  // ==========================================
  const torneoFinalizado = await prisma.torneo.create({
    data: {
      creadorId: organizador.id,
      nombre: 'Apertura Padel 2025',
      descripcion: 'Torneo completado exitosamente con definición de podio.',
      formato: 'grupos_eliminatorias',
      sistemaPuntuacion: 'futbol_clasico',
      cantidadParticipantes: 4,
      cantidadGrupos: 2,
      estado: 'finalizado',
      fechaInicio: new Date('2025-08-01'),
    },
  });

  const eqCampeon = await prisma.equipo.create({ data: { torneoId: torneoFinalizado.id, nombre: 'Pareja Zeta (Campeones)' } });
  
  // Actualizamos el torneo para asignarle el campeón
  await prisma.torneo.update({
    where: { id: torneoFinalizado.id },
    data: { campeonId: eqCampeon.id },
  });

  // ==========================================
  // 5. TORNEO CANCELADO
  // ==========================================
  await prisma.torneo.create({
    data: {
      creadorId: organizador.id,
      nombre: 'Liga Relámpago Básquet 3x3',
      descripcion: 'Torneo cancelado por falta de disponibilidad del polideportivo.',
      formato: 'eliminacion_simple',
      sistemaPuntuacion: 'ganada_perdida',
      cantidadParticipantes: 4,
      estado: 'cancelado',
      fechaInicio: new Date('2025-05-10'),
    },
  });

  console.log('✅ ¡Seeder completo ejecutado con éxito! Tienes torneos en todos los estados.');
}

main()
  .catch((e) => {
    console.error('❌ Error durante la ejecución del seeder:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });