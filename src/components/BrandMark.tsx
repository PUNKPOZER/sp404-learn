import brandRaw from "../assets/brand-logo.svg?raw";

// The supplied cow-on-chair symbol, byte-for-byte. Only the fill is swapped for currentColor so the mark can
// be Ink, Paper or Red. The geometry and aspect ratio (947×1072) are never touched.
const markup = brandRaw.replace(/fill="#F4F4F4"/, 'fill="currentColor"').replace(/<svg[^>]*>/, (tag) =>
  tag.replace(/\s(width|height)="[^"]*"/g, "").replace("<svg", '<svg aria-hidden="true" focusable="false"'));

export function BrandMark({ className = "brand-mark" }: { className?: string }) {
  return <span className={className} dangerouslySetInnerHTML={{ __html: markup }} />;
}
