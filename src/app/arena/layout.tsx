import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Arena",
};

export default function ArenaLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}