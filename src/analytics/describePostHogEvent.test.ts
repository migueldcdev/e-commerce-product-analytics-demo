import type { CaptureResult } from 'posthog-js';
import { describePostHogEvent } from './describePostHogEvent';

function ev(event: string, properties?: unknown): CaptureResult {
  return { event, properties } as unknown as CaptureResult;
}

describe('describePostHogEvent', () => {
  describe('$autocapture', () => {
    it('describes a click on an element with text', () => {
      const event = ev('$autocapture', {
        $event_type: 'click',
        $elements: [{ tag_name: 'button', $el_text: 'Generate demo' }, { tag_name: 'div' }],
      });
      expect(describePostHogEvent(event)).toBe('$autocapture  click  button "Generate demo"');
    });

    it('adds the element id', () => {
      const event = ev('$autocapture', {
        $event_type: 'click',
        $elements: [{ tag_name: 'button', attr__id: 'cta', $el_text: 'Buy' }],
      });
      expect(describePostHogEvent(event)).toBe('$autocapture  click  button#cta "Buy"');
    });

    it('cuts text longer than 40 characters and adds …', () => {
      const long = 'A'.repeat(50);
      const exact = 'B'.repeat(40);

      expect(
        describePostHogEvent(
          ev('$autocapture', {
            $event_type: 'click',
            $elements: [{ tag_name: 'a', $el_text: long }],
          }),
        ),
      ).toBe(`$autocapture  click  a "${'A'.repeat(40)}…"`);
      expect(
        describePostHogEvent(
          ev('$autocapture', {
            $event_type: 'click',
            $elements: [{ tag_name: 'a', $el_text: exact }],
          }),
        ),
      ).toBe(`$autocapture  click  a "${exact}"`);
    });

    it('describes change and submit events', () => {
      expect(
        describePostHogEvent(
          ev('$autocapture', {
            $event_type: 'change',
            $elements: [{ tag_name: 'input', attr__id: 'email' }],
          }),
        ),
      ).toBe('$autocapture  change  input#email');
      expect(
        describePostHogEvent(
          ev('$autocapture', {
            $event_type: 'submit',
            $elements: [{ tag_name: 'form', attr__id: 'signup' }],
          }),
        ),
      ).toBe('$autocapture  submit  form#signup');
    });

    it('reads the element from the start of $elements_chain when $elements is missing', () => {
      const event = ev('$autocapture', {
        $event_type: 'click',
        $elements_chain:
          'button.btn.primary:attr_id="cta"nth-child="1"nth-of-type="1"text="Generate demo";div.wrapper:nth-child="1"nth-of-type="1";body:nth-child="2"nth-of-type="1"',
      });
      expect(describePostHogEvent(event)).toBe('$autocapture  click  button#cta "Generate demo"');
    });

    it('reads a chain element without id or text', () => {
      const event = ev('$autocapture', {
        $event_type: 'click',
        $elements_chain: 'span:nth-child="1"nth-of-type="1";body:nth-child="2"nth-of-type="1"',
      });
      expect(describePostHogEvent(event)).toBe('$autocapture  click  span');
    });

    it('prefers $elements over $elements_chain', () => {
      const event = ev('$autocapture', {
        $event_type: 'click',
        $elements: [{ tag_name: 'button', $el_text: 'From elements' }],
        $elements_chain: 'a:text="From chain"',
      });
      expect(describePostHogEvent(event)).toBe('$autocapture  click  button "From elements"');
    });
  });

  describe('page events', () => {
    it('describes $pageview with the pathname', () => {
      expect(describePostHogEvent(ev('$pageview', { $pathname: '/dashboard' }))).toBe(
        '$pageview  /dashboard',
      );
    });

    it('describes $pageleave with the pathname', () => {
      expect(describePostHogEvent(ev('$pageleave', { $pathname: '/' }))).toBe('$pageleave  /');
    });
  });

  it('describes any other event by its name', () => {
    expect(describePostHogEvent(ev('$rageclick', { $event_type: 'click' }))).toBe('$rageclick');
    expect(describePostHogEvent(ev('custom_event', { foo: 'bar' }))).toBe('custom_event');
  });

  describe('missing or broken properties give the event name alone', () => {
    it.each([
      ['no properties', ev('$autocapture')],
      ['null properties', ev('$autocapture', null)],
      ['string properties', ev('$autocapture', 'nope')],
      ['$elements not an array', ev('$autocapture', { $event_type: 'click', $elements: 'nope' })],
      ['$elements with null', ev('$autocapture', { $event_type: 'click', $elements: [null] })],
      ['empty $elements', ev('$autocapture', { $event_type: 'click', $elements: [] })],
      ['chain not a string', ev('$autocapture', { $event_type: 'click', $elements_chain: 42 })],
      ['empty chain', ev('$autocapture', { $event_type: 'click', $elements_chain: '' })],
      [
        'tag not a string',
        ev('$autocapture', { $event_type: 'click', $elements: [{ tag_name: 5 }] }),
      ],
      ['$pageview without $pathname', ev('$pageview', {})],
      ['$pageview with a non-string $pathname', ev('$pageview', { $pathname: { a: 1 } })],
    ])('%s', (_name, event) => {
      expect(() => describePostHogEvent(event)).not.toThrow();
      expect(describePostHogEvent(event)).toBe(event.event);
    });

    it('a properties getter that throws', () => {
      const event = { event: '$autocapture' } as unknown as CaptureResult;
      Object.defineProperty(event, 'properties', {
        get() {
          throw new Error('broken');
        },
      });
      expect(() => describePostHogEvent(event)).not.toThrow();
      expect(describePostHogEvent(event)).toBe('$autocapture');
    });
  });
});
