import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const sourceRoot = '/Users/shanee/Documents/Shanee-Moret-Codex-Projects/agent-os/CLIENTS/heather-hmp/website-content/drafts/2026-07-22-next-8';
const files = [
  '02-workplace-stress-is-an-operating-signal.md',
  '03-first-90-days-new-manufacturing-supervisor.md',
  '04-ai-workforce-readiness-manufacturing.md',
  '05-aerospace-program-ramp-workforce-readiness.md',
  '06-skills-matrix-workforce-readiness.md',
  '07-weekly-hr-operations-meeting.md',
];

const esc = (value) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const slugify = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function inline(value) {
  let output = esc(value);
  output = output.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  output = output.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  output = output.replace(/`([^`]+)`/g, '<code>$1</code>');
  return output;
}

function prettyPath(value) {
  const name = value.split('/').pop().replace(/\.html$/, '');
  return name.split('-').map((part) => part === 'ai' ? 'AI' : part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

function markdownToHtml(lines) {
  const out = [];
  let list = null;
  const closeList = () => {
    if (list) out.push(`</${list}>`);
    list = null;
  };
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) { closeList(); continue; }
    if (line.startsWith('### ')) { closeList(); out.push(`<h3 id="${slugify(line.slice(4))}">${inline(line.slice(4))}</h3>`); continue; }
    if (line.startsWith('## ')) { closeList(); out.push(`<h2 id="${slugify(line.slice(3))}">${inline(line.slice(3))}</h2>`); continue; }
    const ordered = line.match(/^(\d+)\.\s+(.+)$/);
    const bullet = line.match(/^-\s+(.+)$/);
    if (ordered) {
      if (list !== 'ol') { closeList(); list = 'ol'; out.push('<ol>'); }
      out.push(`<li>${inline(ordered[2])}</li>`);
      continue;
    }
    if (bullet) {
      if (list !== 'ul') { closeList(); list = 'ul'; out.push('<ul>'); }
      out.push(`<li>${inline(bullet[1])}</li>`);
      continue;
    }
    closeList();
    out.push(`<p>${inline(line)}</p>`);
  }
  closeList();
  return out.join('\n');
}

function splitArticle(text) {
  const lines = text.split(/\r?\n/);
  const title = lines[0].replace(/^#\s+/, '').trim();
  const meta = {};
  let index = 1;
  while (index < lines.length) {
    const line = lines[index].trim();
    if (!line) { index += 1; continue; }
    const match = line.match(/^([^:]+):\s*(.+?)\s{0,2}$/);
    if (!match) break;
    meta[match[1]] = match[2].replace(/\*\*/g, '').replace(/  $/, '');
    index += 1;
  }
  const sections = { body: [], related: [], cta: [], sources: [] };
  let current = 'body';
  for (; index < lines.length; index += 1) {
    const line = lines[index];
    if (line.trim() === '## Suggested internal links') { current = 'related'; continue; }
    if (line.trim() === '## CTA copy') { current = 'cta'; continue; }
    if (line.trim() === '## Source notes') { current = 'sources'; continue; }
    sections[current].push(line);
  }
  return { title, meta, sections };
}

function relatedHtml(lines) {
  const items = lines.filter((line) => line.trim().startsWith('- ')).map((line) => {
    const value = line.trim().slice(2).replaceAll('`', '');
    const href = value.startsWith('/blog/') ? value.replace('/blog/', '') : value;
    return `<li><a href="${esc(href)}">${esc(prettyPath(value))}</a></li>`;
  });
  return `<section class="related-reading"><span class="section-label">Related Reading</span><h2>Continue building the system</h2><ul>${items.join('')}</ul></section>`;
}

function faqSchema(body) {
  const faqStart = body.findIndex((line) => line.trim() === '## FAQ');
  if (faqStart < 0) return [];
  const entries = [];
  for (let i = faqStart + 1; i < body.length; i += 1) {
    const line = body[i].trim();
    if (line.startsWith('## ')) break;
    if (!line.startsWith('### ')) continue;
    const question = line.slice(4);
    const answers = [];
    for (let j = i + 1; j < body.length; j += 1) {
      const candidate = body[j].trim();
      if (candidate.startsWith('### ') || candidate.startsWith('## ')) break;
      if (candidate) answers.push(candidate.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1').replace(/\*\*/g, ''));
    }
    entries.push({ '@type': 'Question', name: question, acceptedAnswer: { '@type': 'Answer', text: answers.join(' ') } });
  }
  return entries;
}

for (const file of files) {
  const source = fs.readFileSync(path.join(sourceRoot, file), 'utf8');
  const { title, meta, sections } = splitArticle(source);
  const slug = meta['Proposed slug'].replaceAll('`', '');
  const description = meta['Meta description'];
  const bodyLines = [...sections.body];
  const firstParagraphs = bodyLines.filter((line) => line.trim() && !line.startsWith('#') && !line.startsWith('-') && !/^\d+\./.test(line.trim()));
  const directAnswer = firstParagraphs.slice(0, 2).join(' ');
  const faq = faqSchema(bodyLines);
  const articleSchema = {
    '@context': 'https://schema.org', '@type': 'Article', headline: title, description,
    datePublished: '2026-07-22', dateModified: '2026-07-22',
    mainEntityOfPage: { '@type': 'WebPage', '@id': `https://hmpinnacleconsulting.com/blog/${slug}` },
    image: 'https://hmpinnacleconsulting.com/images/blog-thumbnail-people-ops-blueprint.jpg',
    author: { '@type': 'Person', name: 'Heather MacKay-Mencheski', jobTitle: 'Founder and CEO', worksFor: { '@type': 'Organization', name: 'HM Pinnacle Consulting' } },
    publisher: { '@type': 'Organization', name: 'HM Pinnacle Consulting', url: 'https://hmpinnacleconsulting.com/' }
  };
  const faqScript = faq.length ? `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq })}</script>` : '';
  const sources = markdownToHtml(sections.sources);
  const cta = markdownToHtml(sections.cta);
  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${esc(title)} | HM Pinnacle Consulting</title><meta name="description" content="${esc(description)}"><meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1"><link rel="canonical" href="https://hmpinnacleconsulting.com/blog/${esc(slug)}">
<meta property="og:type" content="article"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}"><meta property="og:url" content="https://hmpinnacleconsulting.com/blog/${esc(slug)}"><meta property="og:image" content="https://hmpinnacleconsulting.com/images/blog-thumbnail-people-ops-blueprint.jpg"><meta name="twitter:card" content="summary_large_image">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700;800&family=Playfair+Display:wght@400;600;700&display=swap" rel="stylesheet"><link rel="stylesheet" href="hmp-insight-2026.css">
<script type="application/ld+json">${JSON.stringify(articleSchema)}</script>${faqScript}</head>
<body><nav class="site-nav"><a href="../index.html" aria-label="HM Pinnacle Consulting home"><img src="../images/hmp-logo.png" alt="HM Pinnacle Consulting"></a><div class="nav-links"><a href="index.html">Insights</a><a href="../services/">Services</a><a class="nav-cta" href="../index.html#contact">Schedule a Conversation</a></div></nav>
<header class="hero"><div class="hero-inner"><a class="back-link" href="index.html">&larr; Back to Insights</a><p class="kicker">${esc(meta['Primary CTA'] || 'People Operations')}</p><h1>${esc(title)}</h1><p class="hero-sub">${esc(description)}</p><p class="hero-meta">Heather MacKay-Mencheski &nbsp;|&nbsp; Published July 22, 2026 &nbsp;|&nbsp; ${Math.max(6, Math.round(source.split(/\s+/).length / 210))} min read</p></div></header>
<main><article class="article"><section class="direct-answer"><span class="section-label">What leaders need to know</span><p>${inline(directAnswer)}</p></section>
${markdownToHtml(bodyLines)}
${relatedHtml(sections.related)}
<section class="cta-block"><span class="section-label">Next Step</span><h2>Build the operating system behind the work</h2>${cta}<div class="cta-actions"><a href="../services/">Explore Services</a><a href="../index.html#contact">Schedule a Conversation</a></div></section>
<section class="source-notes"><span class="section-label">Sources and boundaries</span><h2>Evidence behind this article</h2>${sources}</section>
<section class="author-card"><span class="section-label">About the author</span><h2>Heather MacKay-Mencheski</h2><p>Heather is the founder and CEO of HM Pinnacle Consulting. She helps manufacturing, aerospace, construction, and industrial organizations build leadership systems and people operations that protect workforce stability and execution.</p></section></article></main>
<footer class="site-footer"><div class="footer-inner"><span>&copy; 2026 HM Pinnacle Consulting</span><span><a href="index.html">Insights</a> &nbsp; <a href="../index.html#contact">Contact</a></span></div></footer></body></html>`;
  fs.writeFileSync(path.join(root, 'blog', slug), html);
  process.stdout.write(`Generated blog/${slug}\n`);
}
