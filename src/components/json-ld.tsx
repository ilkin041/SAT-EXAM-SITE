/**
 * Renders a JSON-LD graph into a `<script type="application/ld+json">`.
 *
 * A server component, so the payload ships in the HTML a crawler reads on the
 * first request rather than after hydration. `JSON.stringify` output is escaped
 * for `</script>` — the only sequence that can close the block early — because
 * the graph's strings come from our own modules today but a future one might
 * carry a question stem.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
