import { NextResponse } from "next/server";
import { fetchAggregatedRemoteJobs } from "@/lib/job-sources";

export async function GET() {
  try {
    const jobs = await fetchAggregatedRemoteJobs();
    return NextResponse.json({
      jobs,
      sources: [
        "remotive",
        "arbeitnow",
        "remoteok",
        "himalayas",
        "4dayweek",
        "jobicy",
        "greenhouse",
        "lever",
      ] as const,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to aggregate job listings." },
      { status: 502 },
    );
  }
}
