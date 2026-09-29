export async function POST() {
  return Response.json({status:'email_required'}, {status:410, headers:{'cache-control':'no-store'}});
}
