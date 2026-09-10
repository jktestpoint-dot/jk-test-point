import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { BookmarksPage } from "@/components/BookmarksPage";
import { ACCESS_TOKEN_COOKIE, getAuthenticatedStudent } from "@/lib/supabase-auth";

export default async function Bookmarks() {
  const token = cookies().get(ACCESS_TOKEN_COOKIE)?.value;
  if (!token || !await getAuthenticatedStudent(token)) redirect("/login?next=/bookmarks");
  return <BookmarksPage />;
}
