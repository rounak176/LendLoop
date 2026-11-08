import { SiteHeader } from "@/components/site-header";
import { ToolDirectory } from "@/components/tool-directory";

export default function HomePage() {
  return (
    <div className="app-shell">
      <SiteHeader />
      <main className="main-content">
        <section className="intro-row" aria-labelledby="page-title">
          <div>
            <p className="eyebrow">A neighborhood tool library</p>
            <h1 id="page-title">Good tools, closer by.</h1>
            <p className="intro-copy">
              Borrow what you need. Lend what you don&apos;t. Find useful things around the block,
              and keep good gear in use.
            </p>
          </div>
          <aside className="neighbor-note">
            <strong>Made for sharing, not storing.</strong>
            A drill, a ladder, a little extra room in the shed. It all goes further together.
          </aside>
        </section>
        <ToolDirectory />
        <p className="footer-note">LendLoop keeps listings public and personal loan details private.</p>
      </main>
    </div>
  );
}