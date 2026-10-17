import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getStaffContext } from "@/lib/authz";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const updateSchema = z.object({
  status: z.enum(["PENDING", "IN_TRANSIT", "DELIVERED", "EXCEPTION"]).optional(),
  trackingNumber: z.string().trim().min(5).max(64).regex(/^[A-Za-z0-9-]+$/).optional(),
  carrier: z.string().trim().min(2).max(80).optional(),
  internalNote: z.string().trim().min(1).max(3000).optional(),
}).strict().refine((value) => Object.values(value).some((item) => item !== undefined), "Provide an update.");

function responseError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const staff = await getStaffContext(["ADMIN", "OPERATIONS_STAFF"]);
  if (!staff) return responseError("Unauthorized.", 401);

  let raw: unknown;
  try { raw = await request.json(); } catch { return responseError("Invalid JSON.", 400); }
  const parsed = updateSchema.safeParse(raw);
  if (!parsed.success) return responseError("Invalid shipment update.", 400);

  const { id } = await context.params;
  try {
    const shipment = await db.shipment.findUnique({ where: { id }, select: { id: true, trackingNumber: true } });
    if (!shipment) return responseError("Shipment not found.", 404);

    const { internalNote, ...fields } = parsed.data;
    const result = await db.$transaction(async (tx) => {
      const updated = Object.keys(fields).length
        ? await tx.shipment.update({ where: { id }, data: fields, select: { id: true, trackingNumber: true, status: true, carrier: true, updatedAt: true } })
        : await tx.shipment.findUniqueOrThrow({ where: { id }, select: { id: true, trackingNumber: true, status: true, carrier: true, updatedAt: true } });
      if (internalNote) {
        await tx.shipmentNote.create({ data: { shipmentId: id, note: internalNote } });
      }
      await tx.auditLog.create({
        data: {
          action: `shipment.update fields=${Object.keys(fields).join(",") || "note"} actor=${staff.email.slice(0, 120)}`,
          ipAddress: request.headers.get("x-real-ip")?.slice(0, 64),
          userAgent: request.headers.get("user-agent")?.slice(0, 300),
        },
      });
      return updated;
    });
    return NextResponse.json({ shipment: result }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return responseError("Shipment update could not be saved. Check that the tracking number is not already assigned.", 409);
  }
}
