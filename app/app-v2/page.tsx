import AppV2Client from "./app-v2-client";

export const metadata = {
  title: "TachoCommand App V2",
  robots: { index: false, follow: false },
};

export default function AppV2Page() {
  return <AppV2Client />;
}
