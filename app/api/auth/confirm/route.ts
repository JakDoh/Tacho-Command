// Email sign-in and license activation are retired during the open beta.
export async function POST() {
  return Response.json({status:'open_beta',appUrl:'/app'}, {status:410,headers:{'cache-control':'no-store'}});
}
