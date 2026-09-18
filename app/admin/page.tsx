import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { isAdminHost } from "../../lib/admin-host.js";
import AdminDashboard from "./admin-dashboard";

export default async function AdminPage() {
  const host = (await headers()).get("host");
  const allowLocalhost = process.env.NODE_ENV !== "production";

  if (!isAdminHost(host, { allowLocalhost })) notFound();
  return <AdminDashboard />;
}
