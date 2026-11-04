/* The app's own Help, rendered as a crawlable page (help.html). The source is
   the newest llms-full.txt, which steer's `just` recipe generates from Help, so
   the page is never hand-written and never drifts from the app. Its sections
   are XML-tagged for an LLM; the prompt-only ones (the assistant brief, the
   JSON action list and the settings-file schema) stay in the .txt only. */
import MarkdownIt from "markdown-it";
import { readFileSync } from "node:fs";
import { URL } from "node:url";

const SKIP = new Set(["context", "action_reference", "config_schema_primer", "end_context"]);
const md = new MarkdownIt({ html: false, linkify: false, typographer: false });

export default function () {
  const raw = readFileSync(new URL("../public/llms-full.txt", import.meta.url), "utf8");
  const version = raw.match(/^# Steer (\S+) documentation/m)?.[1];
  const generated = raw.match(/^Generated (\d{4}-\d{2}-\d{2})/m)?.[1];
  if (!version || !generated) throw new Error("llms-full.txt: no version or date line");
  const sections = [];
  for (const [, tag, body] of raw.matchAll(/^<([a-z_]+)>\n([\s\S]*?)^<\/\1>/gm)) {
    if (SKIP.has(tag)) continue;
    const title = body.match(/^## (.+)$/m)?.[1];
    if (!title) throw new Error(`llms-full.txt: section <${tag}> has no ## heading`);
    /* One level down: the page's h1 is "Steer Help", each section an h2. */
    const html = md.render(body.replace(/^## .+\n/m, "")).trim();
    sections.push({ id: tag.replace(/_/g, "-"), title, html });
  }
  if (sections.length < 20) throw new Error(`llms-full.txt: only ${sections.length} sections`);
  return { version, generated, sections };
}
