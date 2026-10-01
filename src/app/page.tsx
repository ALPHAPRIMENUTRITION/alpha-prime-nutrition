import { redirect } from "next/navigation";
import { getSessionProfile, HOME_BY_ROLE } from "@/lib/auth";

export default async function Home() {
  const profile = await getSessionProfile();
  redirect(profile ? HOME_BY_ROLE[profile.role] : "/login");
}
