import { useState, type ReactNode } from 'react';

// Colours are AA on the light console background.
const TYPE_CLASS = {
  key: 'text-rose-800',
  string: 'text-green-700',
  number: 'text-blue-700',
  boolean: 'text-purple-700',
  null: 'text-orange-700',
  special: 'text-zinc-600 italic',
} as const;

type Composite = Record<string, unknown> | unknown[];

function isComposite(value: unknown): value is Composite {
  return typeof value === 'object' && value !== null;
}

/** Applies toJSON (e.g. Date) the way JSON.stringify would, without ever throwing. */
function normalise(value: unknown): unknown {
  if (isComposite(value) && typeof (value as { toJSON?: unknown }).toJSON === 'function') {
    try {
      return (value as { toJSON: () => unknown }).toJSON();
    } catch {
      return value;
    }
  }
  return value;
}

function entriesOf(value: Composite): [string, unknown][] {
  if (Array.isArray(value)) return value.map((item, index) => [String(index), item]);
  return Object.keys(value).map((key) => {
    try {
      return [key, value[key]];
    } catch {
      return [key, '[Error]'];
    }
  });
}

function Primitive({ value }: { value: unknown }) {
  switch (typeof value) {
    case 'string':
      return <span className={TYPE_CLASS.string}>{JSON.stringify(value)}</span>;
    case 'number':
      return <span className={TYPE_CLASS.number}>{String(value)}</span>;
    case 'bigint':
      return <span className={TYPE_CLASS.number}>{`${value}n`}</span>;
    case 'boolean':
      return <span className={TYPE_CLASS.boolean}>{String(value)}</span>;
    case 'undefined':
      return <span className={TYPE_CLASS.special}>undefined</span>;
    case 'function':
      return <span className={TYPE_CLASS.special}>[Function]</span>;
    case 'symbol':
      return <span className={TYPE_CLASS.special}>{value.toString()}</span>;
    default:
      return <span className={TYPE_CLASS.null}>null</span>;
  }
}

interface NodeProps {
  /** Object key, or array index. Absent for the root. */
  name?: string;
  inArray?: boolean;
  value: unknown;
  ancestors: readonly object[];
  depth: number;
  last: boolean;
}

function Label({ name, inArray }: Pick<NodeProps, 'name' | 'inArray'>) {
  if (name === undefined || inArray) return null;
  return (
    <>
      <span className={TYPE_CLASS.key}>{JSON.stringify(name)}</span>
      {': '}
    </>
  );
}

function JsonNode({ name, inArray, value: raw, ancestors, depth, last }: NodeProps) {
  // Below the first level, objects and arrays start closed.
  const [open, setOpen] = useState(depth === 0);
  const value = normalise(raw);
  const comma = last ? null : ',';

  if (!isComposite(value) || ancestors.includes(value)) {
    return (
      <div>
        <Label name={name} inArray={inArray} />
        {isComposite(value) ? (
          <span className={TYPE_CLASS.special}>[Circular]</span>
        ) : (
          <Primitive value={value} />
        )}
        {comma}
      </div>
    );
  }

  const [start, end] = Array.isArray(value) ? ['[', ']'] : ['{', '}'];
  const entries = entriesOf(value);
  let body: ReactNode;
  if (entries.length === 0) {
    body = `${start}${end}`;
  } else if (!open) {
    body = `${start}…${end}`;
  } else {
    const childAncestors = [...ancestors, value];
    body = (
      <>
        {start}
        <div className="pl-4">
          {entries.map(([key, child], index) => (
            <JsonNode
              key={key}
              name={key}
              inArray={Array.isArray(value)}
              value={child}
              ancestors={childAncestors}
              depth={depth + 1}
              last={index === entries.length - 1}
            />
          ))}
        </div>
        {end}
      </>
    );
  }

  if (depth === 0 || entries.length === 0) {
    return (
      <div>
        <Label name={name} inArray={inArray} />
        {body}
        {comma}
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        aria-label={inArray ? `[${name}]` : undefined}
        onClick={() => setOpen((current) => !current)}
        className="-ml-3 rounded-sm text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span aria-hidden="true" className="inline-block w-3 text-zinc-600">
          {open ? '▾' : '▸'}
        </span>
        {!inArray && <span className={TYPE_CLASS.key}>{JSON.stringify(name)}</span>}
      </button>
      {!inArray && ': '}
      {body}
      {comma}
    </div>
  );
}

/** Formatted JSON with nested open/close. Never throws, whatever the value. */
export function JsonView({ value }: { value: unknown }) {
  return (
    <div className="font-mono text-xs leading-5 [overflow-wrap:anywhere] whitespace-pre-wrap">
      <JsonNode value={value} ancestors={[]} depth={0} last />
    </div>
  );
}
