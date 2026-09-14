import { redirect } from "next/navigation";

/** The marketing lander lands here in a later commit; until then the root goes straight to the product. */
export default function Home() {
  redirect("/app");
}
