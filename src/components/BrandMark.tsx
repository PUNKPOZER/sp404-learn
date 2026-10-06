import brandRaw from "../assets/brand-logo.svg?raw";

/** The supplied logo contains a trailing ® built from the LAST FOUR subpaths. The brief says to remove ® from product UI,
 *  so those four subpaths are omitted at render time. Every other coordinate is untouched; the source file stays verbatim. */
export const REGISTERED_SUBPATHS = 4;

export function brandPathData(raw: string, keepRegistered = false): string {
  const d = /\sd="([^"]+)"/.exec(raw)![1];
  const parts = d.split(/(?=M)/);
  return (keepRegistered ? parts : parts.slice(0, parts.length - REGISTERED_SUBPATHS)).join("");
}

const markup = brandRaw.replace(/\sd="[^"]+"/, ` d="${brandPathData(brandRaw)}"`).replace(/fill="#F4F4F4"/, 'fill="currentColor"').replace(/<svg[^>]*>/, (tag) =>
  tag.replace(/\s(width|height)="[^"]*"/g, "").replace("<svg", '<svg aria-hidden="true" focusable="false"'));

export function BrandMark({ className = "brand-mark" }: { className?: string }) {
  return <span className={className} dangerouslySetInnerHTML={{ __html: markup }} />;
}
