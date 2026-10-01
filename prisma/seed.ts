import { PrismaClient, TerrainType, TimeOfDay } from "@prisma/client";
import { runSimulation } from "../src/lib/simulation";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding demo environment...");

  await prisma.performanceSnapshot.deleteMany();
  await prisma.missionRun.deleteMany();
  await prisma.missionScenario.deleteMany();
  await prisma.operationLesson.deleteMany();
  await prisma.historicalOperation.deleteMany();
  await prisma.soldier.deleteMany();
  await prisma.role.deleteMany();
  await prisma.squad.deleteMany();
  await prisma.unit.deleteMany();

  const alpha = await prisma.unit.create({
    data: { name: "Alpha Unit", code: "UNIT-ALPHA" },
  });
  const bravo = await prisma.unit.create({
    data: { name: "Bravo Unit", code: "UNIT-BRAVO" },
  });
  const support = await prisma.unit.create({
    data: { name: "Support Unit", code: "UNIT-SUPPORT" },
  });

  const squadDefs = [
    { name: "Squad A", code: "SQ-A", unitId: alpha.id },
    { name: "Squad B", code: "SQ-B", unitId: alpha.id },
    { name: "Squad C", code: "SQ-C", unitId: bravo.id },
    { name: "Squad D", code: "SQ-D", unitId: bravo.id },
    { name: "Logistics", code: "SQ-LOG", unitId: support.id },
    { name: "Signals", code: "SQ-SIG", unitId: support.id },
  ];

  const squads = await Promise.all(
    squadDefs.map((s) => prisma.squad.create({ data: s }))
  );

  const roleDefs = [
    { name: "Infantry", code: "ROLE-INF-A", squadId: squads[0]!.id },
    { name: "Point", code: "ROLE-POINT-A", squadId: squads[0]!.id },
    { name: "Infantry", code: "ROLE-INF-B", squadId: squads[1]!.id },
    { name: "Medic Support", code: "ROLE-MED-B", squadId: squads[1]!.id },
    { name: "Infantry", code: "ROLE-INF-C", squadId: squads[2]!.id },
    { name: "Scout", code: "ROLE-SCOUT-C", squadId: squads[2]!.id },
    { name: "Heavy", code: "ROLE-HVY-D", squadId: squads[3]!.id },
    { name: "Support", code: "ROLE-SUP-LOG", squadId: squads[4]!.id },
    { name: "Communications", code: "ROLE-COM-SIG", squadId: squads[5]!.id },
    { name: "Navigation", code: "ROLE-NAV-A", squadId: squads[0]!.id },
  ];

  const roles = await Promise.all(
    roleDefs.map((r) => prisma.role.create({ data: r }))
  );

  const soldierSeeds = [
    { code: "S-101", role: 0, exp: 4, mob: 88, end: 82, str: 85, rec: 76, load: 18 },
    { code: "S-102", role: 0, exp: 6, mob: 91, end: 87, str: 88, rec: 81, load: 18 },
    { code: "S-103", role: 7, exp: 3, mob: 79, end: 84, str: 75, rec: 72, load: 16 },
    { code: "S-104", role: 1, exp: 5, mob: 90, end: 85, str: 82, rec: 80, load: 17 },
    { code: "S-105", role: 2, exp: 7, mob: 86, end: 90, str: 89, rec: 84, load: 20 },
    { code: "S-106", role: 3, exp: 4, mob: 83, end: 88, str: 78, rec: 86, load: 14 },
    { code: "S-107", role: 4, exp: 2, mob: 84, end: 80, str: 81, rec: 74, load: 18 },
    { code: "S-108", role: 5, exp: 8, mob: 93, end: 86, str: 84, rec: 82, load: 15 },
    { code: "S-109", role: 6, exp: 5, mob: 77, end: 83, str: 92, rec: 75, load: 24 },
    { code: "S-110", role: 8, exp: 6, mob: 81, end: 85, str: 76, rec: 83, load: 12 },
    { code: "S-111", role: 9, exp: 4, mob: 87, end: 84, str: 80, rec: 79, load: 16 },
    { code: "S-112", role: 2, exp: 3, mob: 85, end: 81, str: 83, rec: 77, load: 19 },
  ];

  const soldiers = [];
  for (const s of soldierSeeds) {
    soldiers.push(
      await prisma.soldier.create({
        data: {
          soldierCode: s.code,
          roleId: roles[s.role]!.id,
          experienceYears: s.exp,
          baselineMobility: s.mob,
          baselineEndurance: s.end,
          baselineStrength: s.str,
          baselineRecovery: s.rec,
          typicalLoadKg: s.load,
          status: "ACTIVE",
        },
      })
    );
  }

  const ops = [
    {
      title: "Operation North Ridge",
      region: "Northern Highlands (synthetic)",
      terrainType: TerrainType.MOUNTAIN,
      altitudeBand: "3200-3800m",
      temperatureBand: "-8 to -2°C",
      durationMinutes: 480,
      timeOfDay: TimeOfDay.NIGHT,
      weatherSummary: "Clear cold night, intermittent wind",
      personnelSummary: "Squad-sized patrol element",
      environmentalFactors: "High altitude; cold; steep approaches",
      humanFactors: "Heavy load; limited rest; night movement demand",
      rawReport: `Operation: North Ridge
Region: Northern Highlands
Terrain: Mountain
Altitude: 3200-3800m
Temperature: -8 to -2°C
Duration: 8 hours
Time: Night
Weather: Clear cold night

Observations:
- Load near 18kg increased fatigue on steep segments
- Short rest windows limited recovery between movements
- Night navigation slowed overall pace

Lessons:
- Reduce load for multi-hour high-altitude night movement
- Schedule structured recovery on long climbs`,
    },
    {
      title: "Operation Winter Passage",
      region: "Eastern Corridor (synthetic)",
      terrainType: TerrainType.STEEP_MOUNTAIN,
      altitudeBand: "2800-3600m",
      temperatureBand: "-12 to -4°C",
      durationMinutes: 600,
      timeOfDay: TimeOfDay.DAY,
      weatherSummary: "Overcast, light snow",
      personnelSummary: "Mixed infantry and support",
      environmentalFactors: "Steep mountain; cold; snow underfoot",
      humanFactors: "Extended duration; cold stress; high movement demand",
      rawReport: `Operation Winter Passage — synthetic training record.
Terrain: Steep Mountain. Duration 10 hours. Cold day movement.`,
    },
    {
      title: "Operation Mountain Echo",
      region: "Central Range (synthetic)",
      terrainType: TerrainType.MOUNTAIN,
      altitudeBand: "2500-3200m",
      temperatureBand: "-2 to 6°C",
      durationMinutes: 360,
      timeOfDay: TimeOfDay.DAY,
      weatherSummary: "Partly cloudy",
      personnelSummary: "Scout-forward element",
      environmentalFactors: "Mountain trails; moderate cold",
      humanFactors: "Moderate load; good recovery discipline",
      rawReport: `Mountain Echo demo record. Daylight mountain movement with structured rest.`,
    },
    {
      title: "Operation Ridge Line Sweep",
      region: "Western Escarpment (synthetic)",
      terrainType: TerrainType.ROLLING,
      altitudeBand: "1200-1800m",
      temperatureBand: "5 to 12°C",
      durationMinutes: 300,
      timeOfDay: TimeOfDay.DAY,
      weatherSummary: "Mild, dry",
      personnelSummary: "Full squad",
      environmentalFactors: "Rolling terrain; mild temperature",
      humanFactors: "Sustainable load; adequate rest",
      rawReport: `Ridge Line Sweep — rolling terrain daylight training scenario.`,
    },
    {
      title: "Operation Silent Approach",
      region: "Valley Network (synthetic)",
      terrainType: TerrainType.MIXED,
      altitudeBand: "800-1400m",
      temperatureBand: "8 to 16°C",
      durationMinutes: 420,
      timeOfDay: TimeOfDay.NIGHT,
      weatherSummary: "Humid, low wind",
      personnelSummary: "Point and infantry mix",
      environmentalFactors: "Mixed terrain; night movement",
      humanFactors: "Night stress; moderate load; intermittent rest",
      rawReport: `Silent Approach — mixed terrain night movement demo.`,
    },
  ];

  const operations = [];
  for (const op of ops) {
    operations.push(
      await prisma.historicalOperation.create({
        data: {
          ...op,
          aiSummary: "DEMO DATA — structured from synthetic report.",
          status: "STRUCTURED",
          isDemo: true,
          lessons: {
            create: [
              {
                title: "Condition-matched planning",
                description: `Reuse ${op.title} environmental band for similar future scenarios.`,
                category: "PLANNING",
              },
              {
                title: "Load vs duration",
                description: "Balance carried load against mission length under terrain stress.",
                category: "LOAD",
              },
              {
                title: "Recovery discipline",
                description: "Explicit rest windows reduce cumulative simulated fatigue.",
                category: "RECOVERY",
              },
            ],
          },
        },
      })
    );
  }

  const primarySoldier = soldiers[0]!;

  const scenarios = [
    {
      name: "High Altitude Patrol",
      terrainType: TerrainType.MOUNTAIN,
      altitudeMeters: 3500,
      temperatureCelsius: -5,
      loadKg: 18,
      distanceKm: 12,
      durationMinutes: 480,
      restMinutes: 15,
      timeOfDay: TimeOfDay.NIGHT,
      description: "Default demo: cold mountain night patrol.",
      soldierId: primarySoldier.id,
      sourceOperationId: operations[0]!.id,
    },
    {
      name: "Daylight Ridge Traverse",
      terrainType: TerrainType.ROLLING,
      altitudeMeters: 1500,
      temperatureCelsius: 8,
      loadKg: 16,
      distanceKm: 10,
      durationMinutes: 300,
      restMinutes: 20,
      timeOfDay: TimeOfDay.DAY,
      description: "Moderate rolling terrain training traverse.",
      soldierId: soldiers[1]!.id,
    },
    {
      name: "Steep Ascent Drill",
      terrainType: TerrainType.STEEP_MOUNTAIN,
      altitudeMeters: 4000,
      temperatureCelsius: -10,
      loadKg: 20,
      distanceKm: 8,
      durationMinutes: 360,
      restMinutes: 10,
      timeOfDay: TimeOfDay.DAY,
      description: "High stress ascent under cold load.",
      soldierId: soldiers[4]!.id,
    },
    {
      name: "Mixed Terrain Night Move",
      terrainType: TerrainType.MIXED,
      altitudeMeters: 1100,
      temperatureCelsius: 10,
      loadKg: 15,
      distanceKm: 14,
      durationMinutes: 420,
      restMinutes: 25,
      timeOfDay: TimeOfDay.NIGHT,
      description: "Extended night movement on mixed ground.",
      soldierId: soldiers[7]!.id,
      sourceOperationId: operations[4]!.id,
    },
    {
      name: "Support Resupply Loop",
      terrainType: TerrainType.FLAT,
      altitudeMeters: 600,
      temperatureCelsius: 18,
      loadKg: 22,
      distanceKm: 16,
      durationMinutes: 240,
      restMinutes: 15,
      timeOfDay: TimeOfDay.DAY,
      description: "Flat terrain resupply with heavier load.",
      soldierId: soldiers[2]!.id,
    },
  ];

  for (const sc of scenarios) {
    const scenario = await prisma.missionScenario.create({ data: sc });
    const soldier = soldiers.find((s) => s.id === sc.soldierId) ?? primarySoldier;
    const result = runSimulation(
      {
        terrainType: sc.terrainType,
        altitudeMeters: sc.altitudeMeters,
        temperatureCelsius: sc.temperatureCelsius,
        loadKg: sc.loadKg,
        distanceKm: sc.distanceKm,
        durationMinutes: sc.durationMinutes,
        restMinutes: sc.restMinutes,
        timeOfDay: sc.timeOfDay,
      },
      {
        baselineMobility: soldier.baselineMobility,
        baselineEndurance: soldier.baselineEndurance,
        baselineStrength: soldier.baselineStrength,
        baselineRecovery: soldier.baselineRecovery,
        experienceYears: soldier.experienceYears,
        typicalLoadKg: soldier.typicalLoadKg,
      }
    );

    await prisma.missionRun.create({
      data: {
        scenarioId: scenario.id,
        soldierId: soldier.id,
        status: "COMPLETED",
        startedAt: new Date(Date.now() - 86_400_000),
        completedAt: new Date(Date.now() - 80_000_000),
        finalFatigue: result.final.fatigue,
        finalMobility: result.final.mobility,
        finalEndurance: result.final.endurance,
        finalPerformance: result.final.performance,
        snapshots: {
          create: result.snapshots.map((p) => ({
            timeMinutes: p.timeMinutes,
            fatigue: p.fatigue,
            mobility: p.mobility,
            endurance: p.endurance,
            performance: p.performance,
          })),
        },
      },
    });
  }

  console.log("Seed complete:");
  console.log(`  Units: 3, Squads: 6, Roles: 10, Soldiers: ${soldiers.length}`);
  console.log(`  Operations: ${operations.length}, Scenarios: ${scenarios.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
