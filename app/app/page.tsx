import AppV2Client from "../app-v2/app-v2-client";

export const metadata = {
  title: "TachoCommand",
  robots: { index: false, follow: false },
};

export default function DriverAppPage() {
  return <AppV2Client />;
}
