import { Prisma, PrismaClient } from "@prisma/client";
import { runSimulation } from "../src/lib/simulation";
import { simulateRoster } from "../src/lib/simulation/group";
import { storeSourceDocument } from "../src/lib/documents/storage";

const prisma = new PrismaClient();
const marker = "[phase6-synthetic-demo]";
const reviewedAt = new Date("2025-06-15T12:00:00.000Z");

async function main() {
  const unit = await prisma.unit.upsert({ where: { code: "DEMO-UNIT-01" }, update: { name: "Synthetic Himalayan Training Group" }, create: { name: "Synthetic Himalayan Training Group", code: "DEMO-UNIT-01" } });
  const company = await prisma.company.upsert({ where: { code: "DEMO-COMPANY-01" }, update: { name: "Synthetic Alpha Company", unitId: unit.id }, create: { name: "Synthetic Alpha Company", code: "DEMO-COMPANY-01", unitId: unit.id } });
  const platoon = await prisma.platoon.upsert({ where: { code: "DEMO-PLATOON-01" }, update: { name: "Synthetic Alpha Platoon", companyId: company.id }, create: { name: "Synthetic Alpha Platoon", code: "DEMO-PLATOON-01", companyId: company.id } });
  const squad = await prisma.squad.upsert({ where: { code: "DEMO-SQUAD-01" }, update: { name: "Synthetic Bravo Squad", unitId: unit.id, platoonId: platoon.id }, create: { name: "Synthetic Bravo Squad", code: "DEMO-SQUAD-01", unitId: unit.id, platoonId: platoon.id } });

  const roleDefinitions = [{ name: "Team Lead", code: "DEMO-ROLE-LEAD" }, { name: "Mobility", code: "DEMO-ROLE-MOBILITY" }, { name: "Support", code: "DEMO-ROLE-SUPPORT" }, { name: "Observer", code: "DEMO-ROLE-OBSERVER" }];
  const roles = await Promise.all(roleDefinitions.map((definition) => prisma.role.upsert({ where: { code: definition.code }, update: { name: definition.name, squadId: squad.id }, create: { ...definition, squadId: squad.id } })));
  const members = [
    { code: "DEMO-HUMAN-01", name: "Arjun Mehta", role: 0, mobility: 82, endurance: 84, strength: 79, recovery: 77 },
    { code: "DEMO-HUMAN-02", name: "Vikram Singh", role: 1, mobility: 86, endurance: 81, strength: 75, recovery: 80 },
    { code: "DEMO-HUMAN-03", name: "Ananya Sen", role: 2, mobility: 78, endurance: 83, strength: 86, recovery: 74 },
    { code: "DEMO-HUMAN-04", name: "Rohan Verma", role: 3, mobility: 84, endurance: 79, strength: 81, recovery: 82 },
  ];
  const soldiers = await Promise.all(members.map((member) => prisma.soldier.upsert({
    where: { soldierCode: member.code },
    update: { displayName: member.name, roleId: roles[member.role]!.id, baselineMobility: member.mobility, baselineEndurance: member.endurance, baselineStrength: member.strength, baselineRecovery: member.recovery, profileProvenance: "SYNTHETIC_DEMO", profileSource: marker, profileAssessedAt: reviewedAt, mobilityProvenance: "SYNTHETIC_DEMO", enduranceProvenance: "SYNTHETIC_DEMO", strengthProvenance: "SYNTHETIC_DEMO", recoveryProvenance: "SYNTHETIC_DEMO", typicalLoadProvenance: "SYNTHETIC_DEMO", weightKg: member.role === 3 ? null : 75, fitnessAssessment: member.role === 3 ? null : "Synthetic example only; not a measured assessment." },
    create: { soldierCode: member.code, displayName: member.name, ageYears: 30, heightCm: 175, weightKg: member.role === 3 ? null : 75, roleId: roles[member.role]!.id, experienceYears: 4, baselineMobility: member.mobility, baselineEndurance: member.endurance, baselineStrength: member.strength, baselineRecovery: member.recovery, typicalLoadKg: 18, fitnessAssessment: member.role === 3 ? null : "Synthetic example only; not a measured assessment.", assessmentDate: member.role === 3 ? null : reviewedAt, assessmentSource: marker, profileProvenance: "SYNTHETIC_DEMO", profileSource: marker, profileAssessedAt: reviewedAt, mobilityProvenance: "SYNTHETIC_DEMO", enduranceProvenance: "SYNTHETIC_DEMO", strengthProvenance: "SYNTHETIC_DEMO", recoveryProvenance: "SYNTHETIC_DEMO", typicalLoadProvenance: "SYNTHETIC_DEMO" },
  })));

  const reportTitle = "Operation Neelkanth · Ridge Traverse (synthetic training report)";
  let operation = await prisma.historicalOperation.findFirst({ where: { title: reportTitle, region: "Synthetic training range" } });
  if (operation && !operation.isDemo) throw new Error(`Refusing to update non-demo operation with reserved demo title: ${reportTitle}`);
  const operationData = {
    title: reportTitle, region: "Synthetic training range", terrainType: "MOUNTAIN" as const,
    operationDate: new Date("2025-05-14T00:00:00.000Z"), missionCategory: "High-altitude patrol training",
    adversaryContext: "Fictional exercise context: opposing-force role players were included in the training area. Presence is descriptive only; no engagement outcomes, counts, or effectiveness measures are represented.",
    altitudeBand: "1800–2400 m", temperatureBand: "4–10 °C", durationMinutes: 180, timeOfDay: "DAY" as const,
    weatherSummary: "Synthetic dry conditions", personnelSummary: "Four synthetic demo profiles",
    environmentalFactors: "Uneven mountain trail; marked water resupply point",
    humanFactors: "Training notes recorded gradual fatigue during the final segment",
    rawReport: "SYNTHETIC TRAINING REPORT. Fictional exercise at a synthetic training range. A four-person group traversed uneven mountain terrain in mild conditions. The report notes gradual fatigue late in the exercise and a planned water resupply point. No real people, units, or operations are represented.",
    aiSummary: null, status: "REVIEWED" as const, extractionMode: "MANUAL" as const,
    workflowStatus: "APPROVED" as const, reviewedAt, reviewedBy: "Synthetic demo review", reviewNotes: "Synthetic authored example; no primary operational source. Conditions and observations are fictional. Some measurements are illustrative and uncertainty is high; do not treat as real historical statistics.", isDemo: true,
  };
  if (!operation) operation = await prisma.historicalOperation.create({ data: operationData });
  else operation = await prisma.historicalOperation.update({ where: { id: operation.id }, data: operationData });
  const lessonDefinitions = [
    { title: "Synthetic water-point tracking", description: "The report records a planned water resupply point; preserve that reference when reviewing the training timeline.", category: "LOGISTICS", sourcePassage: "The report notes a planned water resupply point." },
    { title: "Synthetic late-segment fatigue observation", description: "The report records gradual fatigue late in this exercise; this is a documented observation, not a prediction.", category: "HUMAN PERFORMANCE", sourcePassage: "The report notes gradual fatigue late in the exercise." },
  ];
  for (const lesson of lessonDefinitions) {
    const existing = await prisma.operationLesson.findFirst({ where: { operationId: operation.id, title: lesson.title } });
    if (existing) await prisma.operationLesson.update({ where: { id: existing.id }, data: { ...lesson, reviewStatus: "APPROVED", lifecycle: "IDENTIFIED", extractionMode: "MANUAL", editedDuringReview: true } });
    else await prisma.operationLesson.create({ data: { ...lesson, operationId: operation.id, reviewStatus: "APPROVED", lifecycle: "IDENTIFIED", extractionMode: "MANUAL", editedDuringReview: true } });
  }
  const followUpTitle = "Operation Neelkanth · Ridge Traverse Follow-up (synthetic)";
  let followUp = await prisma.historicalOperation.findFirst({ where: { title: followUpTitle, region: "Synthetic training range" } });
  if (followUp && !followUp.isDemo) throw new Error(`Refusing to update non-demo operation with reserved demo title: ${followUpTitle}`);
  const followUpData = { ...operationData, title: followUpTitle, operationDate: new Date("2025-05-16T00:00:00.000Z"), altitudeBand: "1600–2200 m", temperatureBand: "6–12 °C", durationMinutes: 150, environmentalFactors: "Uneven mountain trail; marked water resupply point", humanFactors: "Training notes recorded gradual fatigue late in the exercise", rawReport: "SYNTHETIC FOLLOW-UP TRAINING REPORT. Fictional exercise at a synthetic training range. A group traversed uneven mountain terrain in mild conditions. The report notes gradual fatigue late in the exercise and documents a planned water resupply point. This is not a real-world observation." };
  if (!followUp) followUp = await prisma.historicalOperation.create({ data: followUpData });
  else followUp = await prisma.historicalOperation.update({ where: { id: followUp.id }, data: followUpData });
  const repeatedLesson = { title: "Synthetic water-point tracking", description: "The report records a planned water resupply point; preserve that reference when reviewing the training timeline.", category: "LOGISTICS", sourcePassage: "The report notes a planned water resupply point." };
  const repeatedLessonRow = await prisma.operationLesson.findFirst({ where: { operationId: followUp.id, title: repeatedLesson.title } });
  if (repeatedLessonRow) await prisma.operationLesson.update({ where: { id: repeatedLessonRow.id }, data: { ...repeatedLesson, reviewStatus: "APPROVED", lifecycle: "IDENTIFIED", extractionMode: "MANUAL", editedDuringReview: true } });
  else await prisma.operationLesson.create({ data: { ...repeatedLesson, operationId: followUp.id, reviewStatus: "APPROVED", lifecycle: "IDENTIFIED", extractionMode: "MANUAL", editedDuringReview: true } });

  async function ensureSyntheticSource(operationId: string, filename: string, text: string) {
    const existingSource = await prisma.operationSourceDocument.findUnique({ where: { operationId } });
    if (existingSource) return;
    const storageRef = await storeSourceDocument(new TextEncoder().encode(text), "TXT");
    await prisma.operationSourceDocument.create({ data: { operationId, originalFilename: filename, fileType: "TXT", fileSizeBytes: Buffer.byteLength(text), storageRef, extractedText: text, status: "LINKED", uploadedAt: reviewedAt } });
  }
  await ensureSyntheticSource(operation.id, "synthetic-neelkanth-ridge-report.txt", operationData.rawReport);
  await ensureSyntheticSource(followUp.id, "synthetic-neelkanth-follow-up.txt", followUpData.rawReport);

  const scenarioName = "Operation Neelkanth · Ridge Traverse (synthetic)";
  let scenario = await prisma.missionScenario.findFirst({ where: { OR: [{ name: scenarioName }, { name: "SYNTHETIC DEMO — Ridge Traverse" }], description: marker } });
  if (!scenario) scenario = await prisma.missionScenario.create({ data: { name: scenarioName, terrainType: "MOUNTAIN", altitudeMeters: 2100, temperatureCelsius: 7, loadKg: 16, distanceKm: 6, durationMinutes: 180, restMinutes: 20, timeOfDay: "DAY", description: "Synthetic military training scenario: a four-person team follows a fictional high-altitude ridge route. Human-performance review focuses on fatigue, recovery intervals, and mobility across uneven terrain. No tactical tasking or combat outcome is modeled.", isDemo: true, soldierId: soldiers[0]!.id, sourceOperationId: operation.id } });
  else scenario = await prisma.missionScenario.update({ where: { id: scenario.id }, data: { name: scenarioName, description: "Synthetic military training scenario: a four-person team follows a fictional high-altitude ridge route. Human-performance review focuses on fatigue, recovery intervals, and mobility across uneven terrain. No tactical tasking or combat outcome is modeled.", isDemo: true, soldierId: soldiers[0]!.id, sourceOperationId: operation.id } });
  const existingRun = await prisma.missionRun.findFirst({ where: { scenarioId: scenario.id, soldierId: soldiers[0]!.id, modelVersion: "deterministic-prototype-1" } });
  if (!existingRun) {
    const inputs = { terrainType: scenario.terrainType, altitudeMeters: scenario.altitudeMeters, temperatureCelsius: scenario.temperatureCelsius, loadKg: scenario.loadKg, distanceKm: scenario.distanceKm, durationMinutes: scenario.durationMinutes, restMinutes: scenario.restMinutes, timeOfDay: scenario.timeOfDay };
    const baseline = { baselineMobility: soldiers[0]!.baselineMobility, baselineEndurance: soldiers[0]!.baselineEndurance, baselineStrength: soldiers[0]!.baselineStrength, baselineRecovery: soldiers[0]!.baselineRecovery, experienceYears: soldiers[0]!.experienceYears, typicalLoadKg: soldiers[0]!.typicalLoadKg };
    const result = runSimulation(inputs, baseline);
    await prisma.missionRun.create({ data: { scenarioId: scenario.id, soldierId: soldiers[0]!.id, status: "COMPLETED", completedAt: reviewedAt, finalFatigue: result.final.fatigue, finalMobility: result.final.mobility, finalEndurance: result.final.endurance, finalPerformance: result.final.performance, inputsSnapshot: inputs, baselineSnapshot: baseline, baselineProvenanceSnapshot: { baselineMobility: "SYNTHETIC_DEMO", baselineEndurance: "SYNTHETIC_DEMO", baselineStrength: "SYNTHETIC_DEMO", baselineRecovery: "SYNTHETIC_DEMO", typicalLoadKg: "SYNTHETIC_DEMO" }, modelVersion: result.modelVersion, snapshots: { create: result.snapshots.map((point) => ({ timeMinutes: point.timeMinutes, fatigue: point.fatigue, mobility: point.mobility, endurance: point.endurance, performance: point.performance })) } } });
  }
  const environments = [
    { name: "Operation Marudhara · Dune Supply Circuit (synthetic)", terrainType: "DESERT" as const, altitudeMeters: 420, temperatureCelsius: 38, loadKg: 14, distanceKm: 9, durationMinutes: 240, restMinutes: 12, soldierId: soldiers[1]!.id, operationDate: new Date("2025-05-20T00:00:00.000Z"), missionCategory: "Desert logistics training", environmentalFactors: "Fictional warm-weather training range; marked rest and water checkpoints", humanFactors: "Exercise notes describe rising fatigue during the final movement segment", adversaryContext: "Fictional role-player presence was included in the exercise background only. No engagement, counts, or effectiveness observations were recorded.", lesson: { title: "Synthetic heat-rest observation", description: "The fictional exercise record notes that planned rest and water checkpoints were part of the training context; this is a documented scenario detail, not a physiological threshold.", category: "HUMAN PERFORMANCE", sourcePassage: "The exercise notes describe rising fatigue during the final movement segment." } },
    { name: "Operation Vanrekha · Forest Egress (synthetic)", terrainType: "FOREST" as const, altitudeMeters: 950, temperatureCelsius: 24, loadKg: 17, distanceKm: 5, durationMinutes: 150, restMinutes: 25, soldierId: soldiers[2]!.id, operationDate: new Date("2025-05-23T00:00:00.000Z"), missionCategory: "Forest route familiarization", environmentalFactors: "Fictional forest training route with uneven ground and limited sight lines", humanFactors: "Training notes record increased perceived effort on uneven ground and a planned recovery stop", adversaryContext: "Fictional opposing-force role players were noted as background exercise context. The report contains no engagement outcomes or effectiveness scoring.", lesson: { title: "Synthetic uneven-ground pacing observation", description: "The record documents perceived effort on uneven ground and a planned stop; it does not establish a causal or predictive relationship.", category: "HUMAN PERFORMANCE", sourcePassage: "Training notes record increased perceived effort on uneven ground and a planned recovery stop." } },
    { name: "Operation Samata · Plains Relay (synthetic)", terrainType: "FLAT" as const, altitudeMeters: 180, temperatureCelsius: 29, loadKg: 12, distanceKm: 11, durationMinutes: 210, restMinutes: 18, soldierId: soldiers[3]!.id, operationDate: new Date("2025-05-28T00:00:00.000Z"), missionCategory: "Plains communications relay training", environmentalFactors: "Fictional open training range with scheduled relay stops", humanFactors: "The synthetic report records a steady pace and one planned recovery interval", adversaryContext: "No opposing-force role-player context was recorded for this fictional exercise.", lesson: { title: "Synthetic planned-recovery note", description: "The report lists one planned recovery interval as part of the scenario record; the simulator does not infer an observed recovery effect from this note.", category: "HUMAN PERFORMANCE", sourcePassage: "The synthetic report records a steady pace and one planned recovery interval." } },
  ];
  for (const environment of environments) {
    const scenarioDescription = `${marker} Synthetic defence training scenario · ${environment.missionCategory}. Fictional personnel and conditions; human-performance context only.`;
    const reportTitle = `${environment.name.replace(" (synthetic)", "")} · Synthetic historical training record`;
    const reportText = `SYNTHETIC HISTORICAL TRAINING RECORD — ${reportTitle}\nEvent date: ${environment.operationDate.toISOString().slice(0, 10)}\nMission category: ${environment.missionCategory}\nAll personnel, event conditions, and observations in this example are invented. This record is not a real operation.\nTerrain: ${environment.terrainType}\nAltitude: ${environment.altitudeMeters} m\nTemperature: ${environment.temperatureCelsius} °C\nDuration: ${environment.durationMinutes} minutes\nEnvironment: ${environment.environmentalFactors}\nHuman-performance observation: ${environment.humanFactors}\nOpposition context: ${environment.adversaryContext}\nLesson: ${environment.lesson.description}\nUncertainty: Synthetic illustrative record with no real-world source; not validated evidence.`;
    const operationData = {
      title: reportTitle, operationDate: environment.operationDate, missionCategory: environment.missionCategory,
      region: `Fictional ${environment.terrainType.toLowerCase()} training range`, terrainType: environment.terrainType,
      altitudeBand: `${environment.altitudeMeters} m`, temperatureBand: `${environment.temperatureCelsius - 2}–${environment.temperatureCelsius + 2} °C`,
      durationMinutes: environment.durationMinutes, timeOfDay: "DAY" as const, weatherSummary: `Synthetic ${environment.terrainType.toLowerCase()} training conditions`,
      personnelSummary: "Fictional synthetic demo profiles only", environmentalFactors: environment.environmentalFactors,
      humanFactors: environment.humanFactors, adversaryContext: environment.adversaryContext,
      rawReport: reportText, aiSummary: null, status: "REVIEWED" as const, extractionMode: "MANUAL" as const,
      workflowStatus: "APPROVED" as const, reviewedAt, reviewedBy: "Synthetic demo review",
      reviewNotes: "Synthetic authored scenario record; no primary source. All details are invented. Opposition context is descriptive training context only. No count, effectiveness estimate, outcome, or tactical conclusion is present.", isDemo: true,
    };
    let historical = await prisma.historicalOperation.findFirst({ where: { title: reportTitle, region: operationData.region } });
    if (historical && !historical.isDemo) throw new Error(`Refusing to update non-demo operation with reserved demo title: ${reportTitle}`);
    if (!historical) historical = await prisma.historicalOperation.create({ data: operationData });
    else historical = await prisma.historicalOperation.update({ where: { id: historical.id }, data: operationData });
    const previousLesson = await prisma.operationLesson.findFirst({ where: { operationId: historical.id, title: environment.lesson.title } });
    const lessonData = { ...environment.lesson, operationId: historical.id, reviewStatus: "APPROVED" as const, extractionMode: "MANUAL" as const, editedDuringReview: false };
    if (!previousLesson) await prisma.operationLesson.create({ data: { ...lessonData, lifecycle: "IDENTIFIED" } });
    else await prisma.operationLesson.update({ where: { id: previousLesson.id }, data: { ...lessonData, lifecycle: "IDENTIFIED" } });
    await ensureSyntheticSource(historical.id, `${environment.terrainType.toLowerCase()}-synthetic-training-report.txt`, reportText);
    const scenarioData = { name: environment.name, terrainType: environment.terrainType, altitudeMeters: environment.altitudeMeters, temperatureCelsius: environment.temperatureCelsius, loadKg: environment.loadKg, distanceKm: environment.distanceKm, durationMinutes: environment.durationMinutes, restMinutes: environment.restMinutes, timeOfDay: "DAY" as const, description: scenarioDescription, sourceOperationId: historical.id, isDemo: true };
    let environmentScenario = await prisma.missionScenario.findFirst({ where: { name: environment.name, description: { contains: marker } } });
    if (!environmentScenario) environmentScenario = await prisma.missionScenario.create({ data: { ...scenarioData, soldierId: environment.soldierId } });
    else environmentScenario = await prisma.missionScenario.update({ where: { id: environmentScenario.id }, data: { name: scenarioData.name, terrainType: scenarioData.terrainType, altitudeMeters: scenarioData.altitudeMeters, temperatureCelsius: scenarioData.temperatureCelsius, loadKg: scenarioData.loadKg, distanceKm: scenarioData.distanceKm, durationMinutes: scenarioData.durationMinutes, restMinutes: scenarioData.restMinutes, timeOfDay: scenarioData.timeOfDay, description: scenarioData.description, isDemo: true, soldier: { connect: { id: environment.soldierId } }, sourceOperation: { connect: { id: historical.id } } } });
    const priorRun = await prisma.missionRun.findFirst({ where: { scenarioId: environmentScenario.id, soldierId: environment.soldierId, modelVersion: "deterministic-prototype-1" } });
    if (!priorRun) {
      const inputs = { terrainType: environmentScenario.terrainType, altitudeMeters: environmentScenario.altitudeMeters, temperatureCelsius: environmentScenario.temperatureCelsius, loadKg: environmentScenario.loadKg, distanceKm: environmentScenario.distanceKm, durationMinutes: environmentScenario.durationMinutes, restMinutes: environmentScenario.restMinutes, timeOfDay: environmentScenario.timeOfDay };
      const member = soldiers.find((candidate) => candidate.id === environment.soldierId)!;
      const baseline = { baselineMobility: member.baselineMobility, baselineEndurance: member.baselineEndurance, baselineStrength: member.baselineStrength, baselineRecovery: member.baselineRecovery, experienceYears: member.experienceYears, typicalLoadKg: member.typicalLoadKg };
      const result = runSimulation(inputs, baseline);
      await prisma.missionRun.create({ data: { scenarioId: environmentScenario.id, soldierId: member.id, status: "COMPLETED", completedAt: reviewedAt, finalFatigue: result.final.fatigue, finalMobility: result.final.mobility, finalEndurance: result.final.endurance, finalPerformance: result.final.performance, inputsSnapshot: inputs, baselineSnapshot: baseline, baselineProvenanceSnapshot: { baselineMobility: "SYNTHETIC_DEMO", baselineEndurance: "SYNTHETIC_DEMO", baselineStrength: "SYNTHETIC_DEMO", baselineRecovery: "SYNTHETIC_DEMO", typicalLoadKg: "SYNTHETIC_DEMO" }, modelVersion: result.modelVersion, snapshots: { create: result.snapshots.map((point) => ({ timeMinutes: point.timeMinutes, fatigue: point.fatigue, mobility: point.mobility, endurance: point.endurance, performance: point.performance })) } } });
    }
  }
  const groupScenarioInputs = { terrainType: scenario.terrainType, altitudeMeters: scenario.altitudeMeters, temperatureCelsius: scenario.temperatureCelsius, loadKg: scenario.loadKg, distanceKm: scenario.distanceKm, durationMinutes: scenario.durationMinutes, restMinutes: scenario.restMinutes, timeOfDay: scenario.timeOfDay };
  const groupResults = simulateRoster(groupScenarioInputs, soldiers.map((member) => ({
    id: member.id,
    soldierCode: member.soldierCode,
    roleName: roles.find((role) => role.id === member.roleId)?.name,
    status: "ACTIVE",
    baseline: { baselineMobility: member.baselineMobility, baselineEndurance: member.baselineEndurance, baselineStrength: member.baselineStrength, baselineRecovery: member.baselineRecovery, experienceYears: member.experienceYears, typicalLoadKg: member.typicalLoadKg },
    provenanceComplete: true,
    synthetic: true,
  })));
  const syntheticGroups = [
    { type: "UNIT", id: unit.id, label: unit.name },
    { type: "COMPANY", id: company.id, label: company.name },
    { type: "PLATOON", id: platoon.id, label: platoon.name },
    { type: "SQUAD", id: squad.id, label: squad.name },
  ];
  for (const group of syntheticGroups) {
    const exists = await prisma.groupSimulationRun.findFirst({ where: { groupType: group.type, groupId: group.id, scenarioId: scenario.id, modelVersion: groupResults.modelVersion } });
    if (!exists) await prisma.groupSimulationRun.create({ data: {
      groupType: group.type, groupId: group.id, unitId: unit.id, squadId: group.type === "SQUAD" ? squad.id : null,
      groupLabelSnapshot: group.label, scenarioId: scenario.id, inputsSnapshot: groupScenarioInputs as unknown as Prisma.InputJsonObject,
      modelVersion: groupResults.modelVersion, includedCount: groupResults.includedCount, excludedCount: groupResults.excludedCount,
      incompleteCount: groupResults.incompleteCount, aggregateSnapshot: { aggregate: groupResults.aggregate, timeline: groupResults.timeline } as unknown as Prisma.InputJsonObject,
      createdAt: reviewedAt,
      members: { create: groupResults.members.map((entry) => ({
        soldierId: entry.id, soldierCode: entry.soldierCode, roleNameSnapshot: entry.roleName, included: entry.included,
        exclusionReason: entry.exclusionReason, profileQuality: entry.profileQuality,
        baselineSnapshot: entry.baseline as unknown as Prisma.InputJsonObject,
        outputSnapshot: entry.final as unknown as Prisma.InputJsonObject,
        timelineSnapshot: entry.timeline as unknown as Prisma.InputJsonArray,
      })) },
    } });
  }
  console.log(JSON.stringify({ status: "ready", marker, unit: unit.code, company: company.code, platoon: platoon.code, squad: squad.code, soldiers: soldiers.map((soldier) => soldier.displayName), scenarios: [scenario.name, ...environments.map((environment) => environment.name)], approvedSyntheticReports: [operation.title, followUp.title], createdOrReused: true }));
}

main().catch((error: unknown) => { console.error(error instanceof Prisma.PrismaClientKnownRequestError ? `Demo seed failed (${error.code}).` : error instanceof Error ? error.message : "Demo seed failed."); process.exitCode = 1; }).finally(async () => { await prisma.$disconnect(); });
