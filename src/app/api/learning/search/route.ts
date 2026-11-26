import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAiConfig } from "@/lib/ai";

const requestSchema = z.object({ query: z.string().trim().min(3).max(200) });

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a search question of at least three characters." }, { status: 400 });
  const tokens = [...new Set(parsed.data.query.toLocaleLowerCase().match(/[\p{L}\p{N}]{3,}/gu) ?? [])].slice(0, 8);
  const records = await prisma.historicalOperation.findMany({
    where: { workflowStatus: "APPROVED", OR: tokens.flatMap((token) => [
      { title: { contains: token, mode: "insensitive" as const } },
      { missionCategory: { contains: token, mode: "insensitive" as const } },
      { region: { contains: token, mode: "insensitive" as const } },
      { humanFactors: { contains: token, mode: "insensitive" as const } },
      { environmentalFactors: { contains: token, mode: "insensitive" as const } },
      { rawReport: { contains: token, mode: "insensitive" as const } },
      { lessons: { some: { reviewStatus: "APPROVED", OR: [{ title: { contains: token, mode: "insensitive" as const } }, { description: { contains: token, mode: "insensitive" as const } }] } } },
    ]) },
    take: 30,
    include: { lessons: { where: { reviewStatus: "APPROVED" }, select: { id: true, title: true, description: true, category: true } }, sourceDocument: { select: { id: true, originalFilename: true } } },
  });
  const queryWords = tokens;
  const score = (record: typeof records[number]) => {
    const text = [record.title, record.missionCategory, record.region, record.humanFactors, record.environmentalFactors, record.rawReport, ...record.lessons.flatMap((lesson) => [lesson.title, lesson.description])].filter(Boolean).join(" ").toLocaleLowerCase();
    return queryWords.reduce((sum, word) => sum + (text.includes(word) ? 1 : 0), 0);
  };
  const lexical = records.slice().sort((a, b) => score(b) - score(a) || (b.reviewedAt?.getTime() ?? 0) - (a.reviewedAt?.getTime() ?? 0)).slice(0, 12);
  const config = getAiConfig();
  let ordered = lexical;
  let aiAvailable = false;
  if (config.enabled && lexical.length) {
    try {
      const candidates = lexical.map((record) => ({ id: record.id, title: record.title, category: record.missionCategory, region: record.region, humanFactors: record.humanFactors, lessons: record.lessons.map(({ title, description, category }) => ({ title, description, category })) }));
      const response = await fetch("https://router.huggingface.co/v1/chat/completions", {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${config.apiKey}` }, signal: AbortSignal.timeout(12_000),
        body: JSON.stringify({ model: config.model, temperature: 0, response_format: { type: "json_object" }, messages: [
          { role: "system", content: "Rank only the supplied approved source IDs by relevance to the search question. Return JSON {\"sourceIds\":[...]} with IDs copied exactly from the supplied list. Do not invent IDs, facts, metrics, summaries, or advice." },
          { role: "user", content: JSON.stringify({ query: parsed.data.query, sources: candidates }) },
        ] }),
      });
      if (!response.ok) throw new Error("Hugging Face ranking unavailable");
      const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
      const content = payload.choices?.[0]?.message?.content;
      if (!content) throw new Error("Empty ranking response");
      const rank = z.object({ sourceIds: z.array(z.string()) }).safeParse(JSON.parse(content));
      if (!rank.success) throw new Error("Invalid ranking response");
      const byId = new Map(lexical.map((record) => [record.id, record]));
      const ranked = [...new Set(rank.data.sourceIds)].flatMap((id) => byId.has(id) ? [byId.get(id)!] : []);
      ordered = [...ranked, ...lexical.filter((record) => !ranked.some((item) => item.id === record.id))];
      aiAvailable = true;
    } catch {
      aiAvailable = false;
    }
  }
  return NextResponse.json({ mode: aiAvailable ? "ai-ranked" : "unavailable", message: aiAvailable ? "Hugging Face reordered retrieved approved records. The displayed facts and lessons come from those records." : "AI ranking is unavailable; results use keyword matching over approved records.", results: ordered.map((record) => ({ id: record.id, title: record.title, category: record.missionCategory, region: record.region, eventDate: record.operationDate?.toISOString() ?? null, isDemo: record.isDemo, humanFactors: record.humanFactors, lessons: record.lessons, sourceDocument: record.sourceDocument })) });
}
