import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/nextauth";
import { API_BASE_URL } from "@/lib/config";

async function ensureAccess() {
  const session = await getServerSession(authOptions);
  return session?.access || session?.token?.access || session?.user?.access || session?.accessToken || null;
}

export async function GET(req) {
  const access = await ensureAccess();
  if (!access) {
    return NextResponse.json(
      { success: false, message: "Unauthorized", data: null, errors: null, meta: null },
      { status: 401 }
    );
  }
  const qs = new URL(req.url).searchParams.toString();
  const upstream = await fetch(`${API_BASE_URL}/api/v1/tasks/${qs ? `?${qs}` : ""}`, {
    headers: { Authorization: `Bearer ${access}` },
    cache: "no-store",
  });
  const data = await upstream.json();
  return NextResponse.json(data, { status: upstream.status });
}
