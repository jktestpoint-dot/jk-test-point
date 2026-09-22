import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact JK Test Point",
  description: "Contact JK Test Point for help with your account, MCQ practice, mock tests or payments.",
  alternates: { canonical: "/contact" },
  openGraph: { title: "Contact JK Test Point", description: "Contact JK Test Point for help with your account, MCQ practice, mock tests or payments.", url: "/contact", type: "website" },
  twitter: { card: "summary", title: "Contact JK Test Point", description: "Contact JK Test Point for help with your account, MCQ practice, mock tests or payments." },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
