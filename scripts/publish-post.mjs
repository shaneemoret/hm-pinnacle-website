#!/usr/bin/env node
/**
 * HM Pinnacle blog publisher.
 *
 * Takes one approved post (a LinkedIn newsletter or video caption that Heather
 * already approved and published) and turns it into a website article:
 *   1. writes blog/<slug>.html using the house article template
 *   2. inserts the card at the top of the blog/index.html grid
 *   3. inserts the JSON-LD ItemList entry
 *   4. adds the sitemap.xml entry
 *
 * Same code path is used by the retroactive backfill and by the Notion
 * automation, so a post published by hand looks identical to an automated one.
 *
 * Usage: node scripts/publish-post.mjs post.json [--repo /path/to/site]
 */

import fs from "node:fs";
import path from "node:path";

const SITE = "https://hmpinnacleconsulting.com";

export function slugify(s) {
  return s
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function esc(s = "") {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function longDate(iso) {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function readTime(markdown) {
  const words = markdown.split(/\s+/).filter(Boolean).length;
  return { words, minutes: Math.max(2, Math.round(words / 225)) };
}

/**
 * Minimal markdown → the subset of HTML the article template uses.
 * Supports: ## / ### headings, paragraphs, - and 1. lists, > quotes, **bold**.
 */
function renderBody(markdown) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const out = [];
  const toc = [];
  let list = null;

  const inline = (t) =>
    esc(t)
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\[(.+?)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" rel="noopener" target="_blank">$1</a>');

  const closeList = () => {
    if (list) {
      out.push(`                </${list}>`);
      out.push("            </div>");
      list = null;
    }
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      closeList();
      continue;
    }

    const h2 = line.match(/^##\s+(?!#)(.*)$/);
    const h3 = line.match(/^###\s+(.*)$/);
    const li = line.match(/^[-*]\s+(.*)$/);
    const oli = line.match(/^\d+\.\s+(.*)$/);
    const quote = line.match(/^>\s*(.*)$/);

    if (h2) {
      closeList();
      const id = slugify(h2[1]);
      toc.push({ id, label: h2[1] });
      out.push(`            <h2 id="${id}">${inline(h2[1])}</h2>`);
    } else if (h3) {
      closeList();
      out.push(`            <h3>${inline(h3[1])}</h3>`);
    } else if (li || oli) {
      const tag = li ? "ul" : "ol";
      if (list !== tag) {
        closeList();
        out.push('            <div class="framework" aria-label="Practical checklist">');
        out.push('                <span class="eyebrow">What to Review</span>');
        out.push(`                <${tag}>`);
        list = tag;
      }
      out.push(`                    <li>${inline((li || oli)[1])}</li>`);
    } else if (quote) {
      closeList();
      out.push(`            <div class="pull-quote"><blockquote>${inline(quote[1])}</blockquote></div>`);
    } else if (/^#\s+/.test(line)) {
      continue; // H1 comes from the title
    } else {
      closeList();
      out.push(`            <p>${inline(line)}</p>`);
    }
  }
  closeList();
  return { html: out.join("\n"), toc };
}

export function buildArticle(post) {
  const { title, slug, description, kicker, date, summary, markdown, keywords = [], faq = [], sourceLabel } = post;
  const { html: bodyHtml, toc } = renderBody(markdown);
  const { words, minutes } = readTime(markdown);
  const url = `${SITE}/blog/${slug}.html`;

  const tocHtml = toc.length
    ? `
<section class="framework" aria-label="Article contents">
                <span class="eyebrow">In This Article</span>
                <ol>
${toc.map((t) => `                    <li><a href="#${t.id}">${esc(t.label)}</a></li>`).join("\n")}
${faq.length ? '                    <li><a href="#faq">FAQ</a></li>\n' : ""}                </ol>
            </section>
`
    : "";

  const faqSection = faq.length
    ? `
            <h2 id="faq">Frequently Asked Questions</h2>
${faq
  .map(
    (f) => `            <h3>${esc(f.q)}</h3>
            <p>${esc(f.a)}</p>`,
  )
  .join("\n")}
`
    : "";

  const faqSchema = faq.length
    ? `    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [
${faq
  .map(
    (f) => `        {
          "@type": "Question",
          "name": ${JSON.stringify(f.q)},
          "acceptedAnswer": { "@type": "Answer", "text": ${JSON.stringify(f.a)} }
        }`,
  )
  .join(",\n")}
      ]
    }
    </script>
`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${esc(title)} | HM Pinnacle Consulting</title>
    <meta name="description" content="${esc(description)}">
    <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1">
    <meta name="author" content="Heather MacKay-Mencheski">
    <meta name="referrer" content="strict-origin-when-cross-origin">
    <link rel="canonical" href="${url}">
    <meta property="og:type" content="article">
    <meta property="og:title" content="${esc(title)}">
    <meta property="og:description" content="${esc(description)}">
    <meta property="og:url" content="${url}">
    <meta property="og:image" content="${SITE}/images/blog-thumbnail-people-ops-blueprint.jpg">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${esc(title)}">
    <meta name="twitter:description" content="${esc(description)}">
    <meta name="twitter:image" content="${SITE}/images/blog-thumbnail-people-ops-blueprint.jpg">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700;800&family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="hmp-article.css">
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "${SITE}/" },
        { "@type": "ListItem", "position": 2, "name": "Insights", "item": "${SITE}/blog/index.html" },
        { "@type": "ListItem", "position": 3, "name": ${JSON.stringify(title)}, "item": "${url}" }
      ]
    }
    </script>
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": ${JSON.stringify(title)},
      "description": ${JSON.stringify(description)},
      "datePublished": "${date}",
      "dateModified": "${date}",
      "inLanguage": "en-US",
      "articleSection": ["People Operations", "Leadership", ${JSON.stringify(kicker)}],
      "wordCount": ${words},
      "mainEntityOfPage": { "@type": "WebPage", "@id": "${url}" },
      "image": "${SITE}/images/blog-thumbnail-people-ops-blueprint.jpg",
      "author": {
        "@type": "Person",
        "name": "Heather MacKay-Mencheski",
        "jobTitle": "Founder and CEO",
        "worksFor": { "@type": "Organization", "name": "HM Pinnacle Consulting" },
        "sameAs": "https://www.linkedin.com/in/heather-mackay-mencheski-22a08510/"
      },
      "publisher": {
        "@type": "Organization",
        "name": "HM Pinnacle Consulting",
        "url": "${SITE}/",
        "logo": { "@type": "ImageObject", "url": "${SITE}/images/hmp-logo.png" }
      },
      "keywords": ${JSON.stringify(keywords)}
    }
    </script>
${faqSchema}</head>
<body>
    <nav class="site-nav" aria-label="Primary navigation">
        <a class="nav-logo" href="../index.html#hero" aria-label="HM Pinnacle Consulting"><img src="../images/hmp-logo.png" alt="HM Pinnacle Logo"></a>
        <div class="nav-actions"><a href="index.html">Insights</a><a href="../webinars/">Webinars</a><a href="../services/">Services</a><a href="../index.html#contact" class="nav-cta-btn">Schedule a Conversation</a></div>
    </nav>
    <header class="hero">
        <div class="hero-inner">
            <a class="back-link" href="index.html">&larr; Back to Insights</a>
            <p class="kicker">${esc(kicker)}</p>
            <h1>${esc(title)}</h1>
            <p class="hero-summary">${esc(summary)}</p>
            <p class="hero-meta">Heather MacKay-Mencheski | ${longDate(date)} | ${minutes} min read</p>
        </div>
    </header>
    <main>
        <article class="content">
            <section class="answer-box" aria-label="Direct answer">
                <strong>Direct Answer</strong>
                <p>${esc(summary)}</p>
            </section>
${tocHtml}
${bodyHtml}
${faqSection}
            <section class="cta-block" aria-label="Work with HM Pinnacle">
                <h2>Build the people operations layer your growth depends on</h2>
                <p>HM Pinnacle helps growing manufacturing, aerospace, and industrial organizations install the leadership systems and HR infrastructure that keep operations steady while the business scales.</p>
                <a class="cta-link" href="../index.html#contact">Talk with HM Pinnacle</a>
            </section>
            <section class="author-bio" aria-label="About the author">
                <img src="../images/heather.jpg" alt="Heather MacKay-Mencheski, Founder and CEO of HM Pinnacle Consulting" loading="lazy">
                <div>
                    <span class="author-bio-label">About the Author</span>
                    <h3>Heather MacKay-Mencheski</h3>
                    <p>Heather MacKay-Mencheski is the founder and CEO of HM Pinnacle Consulting. She helps growing manufacturing, aerospace, construction, and industrial organizations build the people operations systems, leadership routines, and HR infrastructure that protect workforce stability, critical-role retention, and supervisor capability.</p>
                    <p class="author-bio-links"><a href="../about/">About HM Pinnacle</a> <a href="https://www.linkedin.com/in/heather-mackay-mencheski-22a08510/" rel="noopener" target="_blank">LinkedIn</a></p>
                </div>
            </section>
            <section class="related-posts">
                <span class="eyebrow">Related Reading</span>
                <ul>
                    <li><a href="index.html">View the full HM Pinnacle insights library</a></li>
                </ul>
            </section>
        </article>
    </main>
    <footer class="article-footer"><p>&copy; 2026 HM Pinnacle Consulting. People operations consulting for growing manufacturing, aerospace, and industrial companies.</p></footer>
</body>
</html>
`;
}

export function insertIntoIndex(indexHtml, post) {
  const { title, slug, description, kicker, date } = post;
  const href = `${slug}.html`;
  if (indexHtml.includes(`href="${href}"`)) return { html: indexHtml, changed: false };

  const card = `            <a class="blog-card reveal" href="${href}">
                <div class="blog-card-meta">${esc(kicker)}</div>
                <div class="blog-card-date">${longDate(date)}</div>
                <h3 class="blog-card-title">${esc(title)}</h3>
                <p class="blog-card-copy">${esc(description)}</p>
                <span class="blog-card-link">Read Article <span class="arrow">&rarr;</span></span>
            </a>

`;
  let html = indexHtml.replace(/(\n\s*<div class="blog-grid">\n)/, `$1${card}`);

  // JSON-LD ItemList: renumber so positions stay sequential with the new post first.
  const listRe = /("itemListElement":\s*\[\n)((?:\s*\{\s*"@type":\s*"ListItem",\s*"position":\s*\d+,\s*"name":[\s\S]*?\},?\n)+)(\s*\])/g;
  html = html.replace(listRe, (match, open, items, close) => {
    if (!items.includes('"url": "https://hmpinnacleconsulting.com/blog/')) return match; // skip breadcrumb list
    const entries = items.trimEnd().replace(/,$/, "").split("\n").filter(Boolean);
    const fresh = `        { "@type": "ListItem", "position": 1, "name": ${JSON.stringify(title)}, "url": "${SITE}/blog/${slug}.html" },`;
    const renumbered = entries.map((line, i) => line.replace(/"position":\s*\d+/, `"position": ${i + 2}`));
    const last = renumbered.length - 1;
    renumbered[last] = renumbered[last].replace(/,\s*$/, "");
    return `${open}${fresh}\n${renumbered.join("\n")}\n${close}`;
  });

  return { html, changed: true };
}

export function insertIntoSitemap(sitemapXml, post) {
  const loc = `${SITE}/blog/${post.slug}.html`;
  if (sitemapXml.includes(loc)) return { xml: sitemapXml, changed: false };
  const entry = `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${post.date}</lastmod>\n  </url>\n`;
  return { xml: sitemapXml.replace(/<\/urlset>/, `${entry}</urlset>`), changed: true };
}

export function publish(repoRoot, post) {
  const articlePath = path.join(repoRoot, "blog", `${post.slug}.html`);
  const indexPath = path.join(repoRoot, "blog", "index.html");
  const sitemapPath = path.join(repoRoot, "sitemap.xml");

  const wrote = [];
  if (!fs.existsSync(articlePath)) {
    fs.writeFileSync(articlePath, buildArticle(post));
    wrote.push(path.relative(repoRoot, articlePath));
  }

  const idx = insertIntoIndex(fs.readFileSync(indexPath, "utf8"), post);
  if (idx.changed) {
    fs.writeFileSync(indexPath, idx.html);
    wrote.push("blog/index.html");
  }

  const sm = insertIntoSitemap(fs.readFileSync(sitemapPath, "utf8"), post);
  if (sm.changed) {
    fs.writeFileSync(sitemapPath, sm.xml);
    wrote.push("sitemap.xml");
  }

  return { url: `${SITE}/blog/${post.slug}.html`, wrote };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const file = process.argv[2];
  const repoIdx = process.argv.indexOf("--repo");
  const repo = repoIdx > -1 ? process.argv[repoIdx + 1] : process.cwd();
  const post = JSON.parse(fs.readFileSync(file, "utf8"));
  post.slug = post.slug || slugify(post.title);
  const res = publish(repo, post);
  console.log(JSON.stringify(res, null, 2));
}
