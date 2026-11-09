import { prisma } from '../src/infrastructure/database';

async function main() {
  console.log('Iniciando la siembra de datos (seeder)...');

  // Limpiar la base de datos en orden inverso para respetar claves foráneas
  await prisma.enfrentamiento.deleteMany();
  await prisma.integrante.deleteMany();
  await prisma.equipo.deleteMany();
  await prisma.fase.deleteMany();
  await prisma.torneo.deleteMany();
  await prisma.usuario.deleteMany();

  console.log('Base de datos limpia.');

  //Crear un Usuario Organizador
  const organizador = await prisma.usuario.create({
    data: {
      nombre: 'Valeria',
      apellido: 'Giménez',
      email: 'valeria.organizador@test.com',
      contrasenia: '$2b$10$FakeHashedPasswordForTesting123', // Simulando un hash 
    },
  });

  console.log(` --> Usuario creado: ${organizador.email} (ID: ${organizador.id})`);

  // 3. Crear un Torneo
  const torneo = await prisma.torneo.create({
    data: {
      creadorId: organizador.id,
      nombre: 'Torneo Relámpago F5 - Primavera',
      descripcion: 'Torneo de prueba para validar los endpoints del backend.',
      formato: 'liga_simple',
      sistemaPuntuacion: 'futbol_clasico',
      cantidadParticipantes: 4,
      estado: 'en_curso',
      fechaInicio: new Date(),
    },
  });

  console.log(`🏆 Torneo creado: ${torneo.nombre} (ID: ${torneo.id})`);

  // Crear Equipos para el Torneo
  const equipo1 = await prisma.equipo.create({
    data: { torneoId: torneo.id, nombre: 'Los Picapiedras' },
  });
  const equipo2 = await prisma.equipo.create({
    data: { torneoId: torneo.id, nombre: 'Dep. Akdemicos' },
  });
  const equipo3 = await prisma.equipo.create({
    data: { torneoId: torneo.id, nombre: 'Cerveceros FC' },
  });
  const equipo4 = await prisma.equipo.create({
    data: { torneoId: torneo.id, nombre: 'Real Hinchada' },
  });

  console.log('⚽ 4 Equipos creados con éxito.');

  // Crear una Fase inicial de tipo 'liga'
  const faseLiga = await prisma.fase.create({
    data: {
      torneoId: torneo.id,
      tipo: 'liga',
      orden: 1,
      estado: 'activa',
      lineaDeCorte: 2,
      idaYVuelta: false,
    },
  });

  console.log(`📌 Fase creada: Fase de Liga (ID: ${faseLiga.id})`);

  // Crear algunos Enfrentamientos (Partidos de prueba) para la Fase 1
  await prisma.enfrentamiento.createMany({
    data: [
      {
        faseId: faseLiga.id,
        equipoAId: equipo1.id,
        equipoBId: equipo2.id,
        instancia: 'fecha_1',
        resultadoA: 2,
        resultadoB: 1,
        ganadorId: equipo1.id,
      },
      {
        faseId: faseLiga.id,
        equipoAId: equipo3.id,
        equipoBId: equipo4.id,
        instancia: 'fecha_1',
        resultadoA: 1,
        resultadoB: 1,
        ganadorId: null, // Empate
      },
    ],
  });

  console.log('✅ Enfrentamientos de prueba creados.');
  console.log('✅ Seeder finalizado!');
}

main()
  .catch((e) => {
    console.error('❌ Error durante la ejecución del seeder:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });