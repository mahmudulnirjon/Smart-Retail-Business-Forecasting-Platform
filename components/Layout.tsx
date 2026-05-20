import { ReactNode } from "react";
import Sidebar from "./Sidebar";
import Navbar  from "./Navbar";

type LayoutProps = { children: ReactNode };

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top_right,_#0a0a14,_#020208)] text-slate-100">
      <div className="flex min-h-screen">
        <Sidebar />

        <div className="flex min-w-0 flex-1 flex-col">
          <Navbar />
          {/* On mobile: add left padding so content doesn't hide behind hamburger button */}
          <main className="flex-1 p-4 pt-16 lg:pt-4 md:p-6 lg:p-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}