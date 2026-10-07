import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { JsonView } from './JsonView';

describe('JsonView', () => {
  it('keeps keys in their original order', () => {
    const { container } = render(
      <JsonView value={{ zeta: 1, alpha: 2, $os: 'Windows', mid: 3 }} />,
    );
    const text = container.textContent ?? '';

    const positions = ['"zeta"', '"alpha"', '"$os"', '"mid"'].map((key) => text.indexOf(key));
    expect(positions.every((position) => position >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });

  it('renders top-level values as formatted JSON', () => {
    render(
      <JsonView
        value={{
          $os: 'Windows',
          $viewport_width: 1106,
          demo_generated: false,
          $browser_version: null,
        }}
      />,
    );

    expect(screen.getByText('"Windows"')).toBeInTheDocument();
    expect(screen.getByText('1106')).toBeInTheDocument();
    expect(screen.getByText('false')).toBeInTheDocument();
    expect(screen.getByText('null')).toBeInTheDocument();
  });

  it('gives strings, numbers, booleans and null different colours', () => {
    render(<JsonView value={{ s: 'text', n: 42, b: true, z: null }} />);

    const classes = ['"text"', '42', 'true', 'null'].map(
      (text) => screen.getByText(text).className,
    );
    expect(classes.every(Boolean)).toBe(true);
    expect(new Set(classes).size).toBe(4);
  });

  it('starts nested objects and arrays closed, and opens and closes them separately', async () => {
    const user = userEvent.setup();
    render(
      <JsonView
        value={{
          $pathname: '/',
          $elements: [{ tag_name: 'button', $el_text: 'Generate demo' }],
          $set: { plan: 'pro' },
        }}
      />,
    );

    expect(screen.getByText('"/"')).toBeInTheDocument();
    expect(screen.queryByText('"Generate demo"')).not.toBeInTheDocument();
    expect(screen.queryByText('"pro"')).not.toBeInTheDocument();

    const elements = screen.getByRole('button', { name: /\$elements/ });
    const set = screen.getByRole('button', { name: /\$set/ });
    expect(elements).toHaveAttribute('aria-expanded', 'false');
    expect(set).toHaveAttribute('aria-expanded', 'false');

    await user.click(elements);
    expect(elements).toHaveAttribute('aria-expanded', 'true');
    expect(set).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('"pro"')).not.toBeInTheDocument();

    // The array's object item is one level deeper, so it starts closed too.
    expect(screen.queryByText('"Generate demo"')).not.toBeInTheDocument();
    const item = screen.getByRole('button', { name: /^0\b|\[0\]/ });
    await user.click(item);
    expect(screen.getByText('"Generate demo"')).toBeInTheDocument();

    await user.click(elements);
    expect(elements).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('"Generate demo"')).not.toBeInTheDocument();
  });

  it('opens nested toggles from the keyboard', async () => {
    const user = userEvent.setup();
    render(<JsonView value={{ nested: { inner: 'value' } }} />);
    const toggle = screen.getByRole('button', { name: /nested/ });

    toggle.focus();
    await user.keyboard('{Enter}');

    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('"value"')).toBeInTheDocument();
  });

  it('shows circular references as [Circular] without throwing', async () => {
    const user = userEvent.setup();
    const value: Record<string, unknown> = { name: 'root' };
    value.self = value;
    const child: Record<string, unknown> = { label: 'child' };
    child.parent = child;
    value.child = child;

    render(<JsonView value={value} />);

    expect(screen.getByText('[Circular]')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /child/ }));
    expect(screen.getAllByText('[Circular]')).toHaveLength(2);
  });

  it('shows functions as [Function] and undefined as undefined', () => {
    render(<JsonView value={{ fn: () => 1, missing: undefined, ok: 1 }} />);

    expect(screen.getByText('[Function]')).toBeInTheDocument();
    expect(screen.getByText('undefined')).toBeInTheDocument();
    expect(screen.getByText('"missing"')).toBeInTheDocument();
  });

  it('renders primitive and odd top-level values without throwing', () => {
    const { container, rerender } = render(<JsonView value="plain" />);
    expect(screen.getByText('"plain"')).toBeInTheDocument();

    rerender(<JsonView value={undefined} />);
    expect(screen.getByText('undefined')).toBeInTheDocument();

    rerender(<JsonView value={[1, 'two', null]} />);
    expect(screen.getByText('"two"')).toBeInTheDocument();

    rerender(<JsonView value={{}} />);
    expect(container.textContent).toMatch(/\{\s*\}/);
  });
});
