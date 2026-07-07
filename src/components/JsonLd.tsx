/**
 * Serializes schema.org structured data into a JSON-LD script tag with
 * HTML-safe escaping: JSON.stringify alone doesn't escape `<`, so data
 * containing `</script>` could break out of the tag (XSS sink). All current
 * data is static site config, but every schema component routes through here
 * so the guarantee holds as content grows.
 */
export function JsonLd({ data }: { data: object }) {
  const json = JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
