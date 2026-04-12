import { NextRequest, NextResponse } from "next/server";
import { getProfile } from "@/lib/auth";
import { getPermit } from "@/lib/permits";
import { generateDeliberationHwpx } from "@/lib/hwpx-generator";

export async function POST(request: NextRequest) {
  const profile = await getProfile();
  if (!profile || profile.status !== "active") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { permitId: string; committeeNo: number; hearingDate?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { permitId, committeeNo, hearingDate } = body;
  if (!permitId || !committeeNo) {
    return NextResponse.json({ error: "permitId and committeeNo are required" }, { status: 400 });
  }

  const permit = await getPermit(permitId);
  if (!permit) {
    return NextResponse.json({ error: "Permit not found" }, { status: 404 });
  }

  const hwpxBuffer = await generateDeliberationHwpx(permit, committeeNo, hearingDate);

  const filename = `소심의의결서_${permit.advertiser}.hwpx`;
  const encodedFilename = encodeURIComponent(filename);

  return new NextResponse(new Uint8Array(hwpxBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodedFilename}`,
    },
  });
}
