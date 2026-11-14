// Public beta access does not depend on email, cookies, database or expiry.
export async function GET() {
  return Response.json({status:'open_beta'}, {headers:{'cache-control':'no-store'}});
}
export async function POST() { return GET(); }
