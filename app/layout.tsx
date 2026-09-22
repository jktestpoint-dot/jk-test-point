import type { Metadata } from "next"; import "./globals.css"; import { Header } from "@/components/Header"; import { Footer } from "@/components/Footer"; import { getAvailableFreePracticeSubjects } from "@/lib/free-subject-catalog";
export const metadata: Metadata = {
  metadataBase: new URL("https://jktestpoint.vercel.app"),
  title: { default: "JK Test Point | Better Preparation", template: "%s | JK Test Point" },
  description: "High-quality mock tests and MCQ practice for Jammu & Kashmir and government exam aspirants.",
  keywords: ["JKSSB mock test", "JKPSC", "Jammu Kashmir exams"],
  openGraph: {
    type: "website",
    url: "https://jktestpoint.vercel.app",
    siteName: "JK Test Point",
    title: "JK Test Point | Better Preparation",
    description: "High-quality mock tests and MCQ practice for Jammu & Kashmir and government exam aspirants.",
  },
  twitter: {
    card: "summary",
    title: "JK Test Point | Better Preparation",
    description: "High-quality mock tests and MCQ practice for Jammu & Kashmir and government exam aspirants.",
  },
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
};
export default async function RootLayout({children}:{children:React.ReactNode}) {
  const freePracticeSubjects = await getAvailableFreePracticeSubjects().catch(() => []);
  const freePracticeHref = freePracticeSubjects.length ? "/free-mcq-practice" : null;
  return <html lang="en"><body><Header freePracticeHref={freePracticeHref}/><main>{children}</main><Footer freePracticeHref={freePracticeHref}/></body></html>
}
