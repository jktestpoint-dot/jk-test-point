import type { MetadataRoute } from "next";

const disallowed = [
  "/api/",
  "/admin",
  "/dashboard",
  "/attempts",
  "/analytics",
  "/profile",
  "/bookmarks",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/results",
  "/mcq-practice/*/attempt",
  "/mcq-practice/*/results",
  "/free-mcq-practice/*/attempt",
  "/free-mcq-practice/*/results",
  "/mock-tests/*/attempt",
  "/mock-tests/*/leaderboard",
  "/payments/",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: disallowed },
    sitemap: "https://jktestpoint.vercel.app/sitemap.xml",
    host: "https://jktestpoint.vercel.app",
  };
}
