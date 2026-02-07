import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/nextauth";
import { API_BASE_URL } from "@/lib/config";

export async function POST(req) {
  const session = await getServerSession(authOptions);
  const access =
    session?.access ||
    session?.token?.access ||
    session?.user?.access ||
    session?.accessToken;

  if (!access) {
    return NextResponse.json(
      {
        success: false,
        message: "Authentication credentials were not provided.",
        data: null,
        errors: null,
        meta: null,
      },
      { status: 401 }
    );
  }

  const payload = await req.json();

  const upstream = await fetch(`${API_BASE_URL}/api/v1/profile/change-password/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${access}`,
    },
    body: JSON.stringify(payload),
    credentials: "include",
  });

  const data = await upstream.json();
  return NextResponse.json(data, { status: upstream.status });
}
