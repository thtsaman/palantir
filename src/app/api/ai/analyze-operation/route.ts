import { POST as analyzeOperation } from "@/app/api/operations/analyze/route";

/** Alias of `/api/operations/analyze` */
export async function POST(request: Request) {
  return analyzeOperation(request);
}
