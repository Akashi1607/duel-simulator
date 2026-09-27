import "server-only";
import { cache } from "react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const getCurrentUserId = cache(async () => {
  const session = await auth();
  return session?.user ? ((session.user as { id?: string }).id ?? null) : null;
});

// Cached per request: Navbar and page components both need the wallet, and
// without this every navigation issued a duplicate lookup (plus an
// unconditional wallet upsert) that helped exhaust the DB connection pool.
export const getCurrentUserWallet = cache(async () => {
  const userId = await getCurrentUserId();
  if (!userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, wallet: { select: { gold: true, cash: true } } },
  });

  if (!user) return null;

  const wallet =
    user.wallet ??
    (await prisma.wallet.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id },
    }));

  return { userId: user.id, wallet };
});
