import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { isAdminHost } from "../lib/admin-host.js";
import InstallGuide from "./install-guide";
import LandingPage from "./landing-page";

export default async function Home() {
  const host = (await headers()).get("host");
  if (isAdminHost(host)) redirect("/admin");

  return (
    <>
      <LandingPage />
      <InstallGuide />
    </>
  );
}
