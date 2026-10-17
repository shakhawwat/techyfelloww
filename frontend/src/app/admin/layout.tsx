import "./admin.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin · Techy Fellow", robots: { index: false, follow: false, googleBot: { index: false, follow: false } } };
export default function AdminLayout({ children }: { children: ReactNode }) { return children; }
