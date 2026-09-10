import type { Metadata } from "next"; import "./globals.css"; import { Header } from "@/components/Header"; import { Footer } from "@/components/Footer"; import { getAvailableFreePracticeSubjects } from "@/lib/free-subject-catalog";
export const metadata: Metadata = { title:{default:"JK Test Point | Better Preparation",template:"%s | JK Test Point"},description:"High-quality mock tests for Jammu & Kashmir and government exam aspirants.",keywords:["JKSSB mock test","JKPSC","Jammu Kashmir exams"]};
export default async function RootLayout({children}:{children:React.ReactNode}) {
  const freePracticeSubjects = await getAvailableFreePracticeSubjects().catch(() => []);
  const freePracticeHref = freePracticeSubjects[0] ? `/free-mcq-practice/${freePracticeSubjects[0].id}` : null;
  return <html lang="en"><body><Header freePracticeHref={freePracticeHref}/><main>{children}</main><Footer freePracticeHref={freePracticeHref}/></body></html>
}
