import type { CaptureResult } from 'posthog-js';

const MAX_TEXT = 40;

interface ClickedElement {
  tag: string;
  id?: string;
  text?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const nonEmpty = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;

function fromElements(elements: unknown): ClickedElement | undefined {
  if (!Array.isArray(elements)) return undefined;
  const first: unknown = elements[0];
  if (!isRecord(first)) return undefined;
  const tag = nonEmpty(first.tag_name);
  if (!tag) return undefined;
  return {
    tag,
    id: nonEmpty(first.attr__id) ?? nonEmpty(first.attr_id),
    text: nonEmpty(first.$el_text),
  };
}

/** The first element of `$elements_chain`, e.g. `button.btn:attr_id="cta"text="Buy";div:…`. */
function fromChain(chain: unknown): ClickedElement | undefined {
  if (typeof chain !== 'string' || chain === '') return undefined;

  // Cut at the first `;` that is not inside a quoted value.
  let end = chain.length;
  let quoted = false;
  for (let i = 0; i < chain.length; i++) {
    const char = chain[i];
    if (char === '\\') i++;
    else if (char === '"') quoted = !quoted;
    else if (char === ';' && !quoted) {
      end = i;
      break;
    }
  }
  const segment = chain.slice(0, end);

  const tag = /^[a-zA-Z][\w-]*/.exec(segment)?.[0];
  if (!tag) return undefined;
  const attributes: Record<string, string> = {};
  for (const [, key, value] of segment.matchAll(/([\w-]+)="((?:[^"\\]|\\.)*)"/g)) {
    attributes[key] = value.replace(/\\(.)/g, '$1');
  }
  return {
    tag,
    id: nonEmpty(attributes.attr__id) ?? nonEmpty(attributes.attr_id),
    text: nonEmpty(attributes.text),
  };
}

function formatElement({ tag, id, text }: ClickedElement): string {
  let result = id ? `${tag}#${id}` : tag;
  if (text) {
    const cut = text.length > MAX_TEXT ? `${text.slice(0, MAX_TEXT)}…` : text;
    result += ` "${cut}"`;
  }
  return result;
}

/** One-line summary of a PostHog event for the console row. Never throws. */
export function describePostHogEvent(event: CaptureResult): string {
  let name = '';
  try {
    name = String(event.event);
    const properties: unknown = event.properties;
    if (!isRecord(properties)) return name;

    if (name === '$autocapture') {
      const type = nonEmpty(properties.$event_type);
      const element = fromElements(properties.$elements) ?? fromChain(properties.$elements_chain);
      if (!type || !element) return name;
      return `${name}  ${type}  ${formatElement(element)}`;
    }

    if (name === '$pageview' || name === '$pageleave') {
      const pathname = nonEmpty(properties.$pathname);
      return pathname ? `${name}  ${pathname}` : name;
    }

    return name;
  } catch {
    return name;
  }
}
