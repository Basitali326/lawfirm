import { apiFetch } from "@/lib/api";

export async function POST(request) {
  return Response.json(
    { success: false, message: "Invite flow disabled", data: null, errors: null, meta: null },
    { status: 400 }
  );
}
