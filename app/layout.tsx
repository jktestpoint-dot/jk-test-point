import type { Metadata } from "next"; import "./globals.css"; import { Header } from "@/components/Header"; import { Footer } from "@/components/Footer";
export const metadata: Metadata = { title:{default:"JK Test Point | Better Preparation",template:"%s | JK Test Point"},description:"High-quality mock tests for Jammu & Kashmir and government exam aspirants.",keywords:["JKSSB mock test","JKPSC","Jammu Kashmir exams"]};
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="en"><body><Header/><main>{children}</main><Footer/></body></html> }
