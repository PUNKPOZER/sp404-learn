import { BrandMark } from "./BrandMark";

/** Sidebar/header lockup: cow-on-chair mark + product name + neutral "FOR SP-404MKII" line. */
export function Logo() {
  return (
    <span className="brand">
      <BrandMark />
      <span className="brand-text"><b>SP-404</b><span className="brand-pill">LEARN</span></span>
    </span>
  );
}
