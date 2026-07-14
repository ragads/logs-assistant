import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProjectWithSecret } from "@/lib/projects";
import { fetchProjectLogs } from "@/lib/logs";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const loaded = await getProjectWithSecret(params.id);
  if (!loaded) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  if (!loaded.accessToken) {
    return NextResponse.json({
      logs: [],
      error: "No Supabase access token for this project. Edit the connection and add one to read logs."
    });
  }

  const { searchParams } = new URL(request.url);
  const result = await fetchProjectLogs(loaded.project.url, loaded.accessToken, {
    from: searchParams.get("from"),
    to: searchParams.get("to"),
    level: searchParams.get("level"),
    q: searchParams.get("q"),
    source: searchParams.get("source"),
    limit: Number(searchParams.get("limit") ?? 200),
    noCache: searchParams.get("refresh") === "1"
  });

  return NextResponse.json(result);
}
