// Liveness check for the container, called by the load balancer's target
// Health check and the image's HEALTHCHECK. It answers from the Node process
// Alone, with no database call and no request data, so a database outage does
// Not cycle otherwise healthy tasks.
export const runtime = "nodejs";

export function GET() {
  return Response.json(
    { status: "ok" },
    {
      headers: {
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}
