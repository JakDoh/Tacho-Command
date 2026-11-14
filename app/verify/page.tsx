import { redirect } from "next/navigation";

// Previously sent sign-in links now lead straight to the public beta.
export default function VerifyPage() {
  redirect("/app");
}
