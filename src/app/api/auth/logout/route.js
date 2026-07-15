import { cookies } from "next/headers";
import { handler, ok } from "@/lib/api";
import { TOKEN_COOKIE } from "@/lib/auth/jwt";

export const runtime = "nodejs";

export const POST = handler(async () => {
  const store = await cookies();
  store.delete(TOKEN_COOKIE);
  return ok({ loggedOut: true });
});
