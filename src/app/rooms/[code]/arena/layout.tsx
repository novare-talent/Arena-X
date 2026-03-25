export default function ArenaLayout({ children }: { children: React.ReactNode }) {
  // Full-screen editor — no extra wrapper, Navbar already provided by parent rooms/layout.tsx
  return <>{children}</>;
}