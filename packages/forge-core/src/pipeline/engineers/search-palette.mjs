import { join } from "node:path";
import { writeFileOnce } from "./shared.mjs";

export const task = "search-palette";
export const description = "Build the BookSmith Web OS search palette.";

export function run({ webRoot }) {
  writeFileOnce(join(webRoot, "lib/search-index.ts"), `export const searchIndex = [
  { id: "dashboard", label: "Dashboard", target: "dashboard" },
  { id: "booksmith", label: "BookSmith Studio", target: "booksmith" },
  { id: "settings", label: "Settings", target: "settings" },
  { id: "terminal", label: "Terminal", target: "terminal" }
];
`);

  writeFileOnce(join(webRoot, "components/SearchPalette.tsx"), `import { searchIndex } from "../lib/search-index";

export function SearchPalette() {
  return (
    <section className="panel">
      <h2>Search</h2>
      <input aria-label="Search BookSmith OS" placeholder="Search apps, files, and commands..." />
      <div className="search-results">
        {searchIndex.map((item) => (
          <button key={item.id}>{item.label}</button>
        ))}
      </div>
    </section>
  );
}
`);
}
