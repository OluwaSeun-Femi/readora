import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { getReaderLoans, getStreak, getToday } from "@/db/queries";
import { currentMember } from "@/lib/member-auth";
import { SiteHeader } from "@/components/site-header";
import { MemberSignIn } from "@/components/reader/sign-in";
import { ReaderHome } from "@/components/reader/reader-home";

export const metadata: Metadata = {
  title: "My books",
  description: "The books you have from Readora, how far you are, and your reading streak.",
};

export default function MePage() {
  return (
    <>
      <SiteHeader active="me" />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-24 pt-8 sm:px-6 sm:pt-12">
        <Suspense fallback={<MeLoading />}>
          <MeData />
        </Suspense>
      </main>
    </>
  );
}

async function MeData() {
  await connection();
  const member = await currentMember();
  if (!member) return <MemberSignIn />;
  const [loans, streak, today] = await Promise.all([getReaderLoans(member.id), getStreak(member.id), getToday()]);
  return <ReaderHome name={member.name} loans={loans} streak={streak} today={today} />;
}

function MeLoading() {
  return (
    <div aria-busy="true" className="space-y-4">
      <div className="h-12 w-72 max-w-full animate-pulse rounded-lg bg-sunken" />
      <div className="h-56 animate-pulse rounded-[18px] bg-sunken" />
      <p className="sr-only">Loading your books…</p>
    </div>
  );
}
