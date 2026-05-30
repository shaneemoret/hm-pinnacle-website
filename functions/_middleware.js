const HOMEPAGE_LINK_HEADER =
  '</.well-known/api-catalog>; rel="api-catalog"; type="application/linkset+json", ' +
  '</llms.txt>; rel="service-doc"; type="text/plain", ' +
  '</sitemap.xml>; rel="describedby"; type="application/xml"';

const MARKDOWN_ROUTES = new Map([
  ["/", "/agent-markdown/index.md"],
  ["/index.html", "/agent-markdown/index.md"],
]);

export async function onRequest(context) {
  const requestUrl = new URL(context.request.url);
  const pathname = normalizePathname(requestUrl.pathname);
  const wantsMarkdown = acceptsMarkdown(context.request);
  const markdownPath = MARKDOWN_ROUTES.get(pathname);

  if (wantsMarkdown && markdownPath) {
    const markdownUrl = new URL(markdownPath, requestUrl.origin);
    const markdownRequest = new Request(markdownUrl.toString(), context.request);
    const markdownResponse = await context.env.ASSETS.fetch(markdownRequest);

    if (markdownResponse.ok) {
      return withAgentHeaders(markdownResponse, {
        contentType: "text/markdown; charset=utf-8",
        includeTokenCount: true,
        markdownText: await markdownResponse.clone().text(),
      });
    }
  }

  const response = await context.next();
  return withAgentHeaders(response, {
    addLinkHeader: pathname === "/" || pathname === "/index.html",
  });
}

function normalizePathname(pathname) {
  if (!pathname || pathname === "") return "/";
  return pathname;
}

function acceptsMarkdown(request) {
  return request.headers
    .get("accept")
    ?.split(",")
    .some((part) => part.trim().toLowerCase().startsWith("text/markdown"));
}

function withAgentHeaders(response, options = {}) {
  const headers = new Headers(response.headers);

  if (options.addLinkHeader !== false) {
    headers.set("Link", HOMEPAGE_LINK_HEADER);
  }

  if (options.contentType) {
    headers.set("Content-Type", options.contentType);
    headers.set("Vary", mergeVary(headers.get("Vary"), "Accept"));
  }

  if (options.includeTokenCount && options.markdownText) {
    headers.set("x-markdown-tokens", estimateTokenCount(options.markdownText));
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function mergeVary(currentValue, value) {
  const values = new Set(
    (currentValue || "")
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean),
  );
  values.add(value);
  return Array.from(values).join(", ");
}

function estimateTokenCount(markdownText) {
  return String(Math.max(1, Math.ceil(markdownText.trim().split(/\s+/).length * 1.3)));
}
