import assert from "node:assert/strict";
import test from "node:test";

const baseUrl = (process.env.TEST_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const subjectPath = "/free-mcq-practice/computer";

test("Free MCQ subject landing page is public and canonical", async () => {
  const response = await fetch(`${baseUrl}${subjectPath}`, { redirect: "manual" });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("location"), null);
  const html = await response.text();
  const normalizedHtml = html.replaceAll("<!-- -->", "");
  assert.match(normalizedHtml, /<h1[^>]*>Computer Free MCQ Practice<\/h1>/);
  assert.match(normalizedHtml, /<link rel="canonical" href="https:\/\/jktestpoint\.vercel\.app\/free-mcq-practice\/computer"\/>/);
});

test("Free MCQ attempt page still redirects anonymous visitors to login", async () => {
  const response = await fetch(`${baseUrl}${subjectPath}/attempt`, { redirect: "manual" });
  assert.ok([307, 308].includes(response.status));
  assert.equal(response.headers.get("location"), `/login?next=${subjectPath}/attempt`);
});

test("Free MCQ questions and submission APIs still reject anonymous access", async () => {
  const questions = await fetch(`${baseUrl}/api${subjectPath}/questions`);
  assert.equal(questions.status, 401);
  const submission = await fetch(`${baseUrl}/api${subjectPath}/attempt`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ answers: [] }),
  });
  assert.equal(submission.status, 401);
});
