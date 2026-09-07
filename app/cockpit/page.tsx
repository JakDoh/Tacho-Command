import TachoCommandApp from "../tacho-command-app";

export const metadata = {
  title: "TachoCommand — Cockpit",
  description:
    "Mobilní cockpit pro profesionální řidiče autobusů a kamionů. Kontinuální jízda, denní řízení, směna a přestávka na jednom místě.",
};

export default function CockpitPage() {
  return <TachoCommandApp />;
}
