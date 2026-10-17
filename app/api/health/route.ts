export function GET() {
  return Response.json(
    {
      status: "ok",
      service: "neltrix-web",
      note: "This checks web-process availability only; it does not verify database, carrier, or payment integrations.",
    },
    { status: 200 },
  );
}
