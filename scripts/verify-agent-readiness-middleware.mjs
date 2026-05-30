import { onRequest } from "../functions/_middleware.js";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;

async function assetsFetch(request) {
  const url = new URL(request.url);
  const filePath = join(root, decodeURIComponent(url.pathname));
  const body = await readFile(filePath);
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": url.pathname.endsWith(".md")
        ? "text/markdown; charset=utf-8"
        : "text/html; charset=utf-8",
    },
  });
}

async function runCase(name, request) {
  const response = await onRequest({
    request,
    env: { ASSETS: { fetch: assetsFetch } },
    next: async () =>
      new Response(await readFile(join(root, "index.html")), {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      }),
  });

  return {
    name,
    status: response.status,
    contentType: response.headers.get("content-type"),
    link: response.headers.get("link"),
    vary: response.headers.get("vary"),
    markdownTokens: response.headers.get("x-markdown-tokens"),
  };
}

const results = [
  await runCase("html-default", new Request("https://hmpinnacleconsulting.com/")),
  await runCase(
    "markdown-negotiation",
    new Request("https://hmpinnacleconsulting.com/", {
      headers: { Accept: "text/markdown" },
    }),
  ),
];

const failures = [];
if (!results[0].link?.includes('rel="api-catalog"')) {
  failures.push("default homepage response is missing api-catalog Link header");
}
if (results[0].contentType !== "text/html; charset=utf-8") {
  failures.push("default homepage response should remain HTML");
}
if (results[1].contentType !== "text/markdown; charset=utf-8") {
  failures.push("markdown request did not return text/markdown");
}
if (!results[1].markdownTokens) {
  failures.push("markdown response is missing x-markdown-tokens");
}

console.log(JSON.stringify({ results, failures }, null, 2));

if (failures.length) {
  process.exitCode = 1;
}
