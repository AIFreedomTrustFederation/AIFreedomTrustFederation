import { join } from "node:path";
import { writeFileOnce } from "./shared.mjs";

export const task = "file-explorer";
export const description = "Build the BookSmith Web OS file explorer surface.";

export function run({ webRoot }) {
  writeFileOnce(
    join(webRoot, "lib/file-explorer-registry.ts"),
    `export type FileExplorerItem = {
  id: string;
  label: string;
  path: string;
  kind: "folder" | "document" | "registry";
};

export const fileExplorerItems: FileExplorerItem[] = [
  { id: "library", label: "Library", path: "/library", kind: "folder" },
  { id: "manuscripts", label: "Manuscripts", path: "/library/manuscripts", kind: "folder" },
  { id: "citations", label: "Citations", path: "/library/citations", kind: "registry" },
  { id: "roadmap", label: "Roadmap", path: "/docs/roadmaps", kind: "document" }
];
`
  );

  writeFileOnce(
    join(webRoot, "components/FileExplorer.tsx"),
    `import { fileExplorerItems } from "../lib/file-explorer-registry";

export function FileExplorer() {
  return (
    <section className="panel">
      <h2>File Explorer</h2>
      <div className="file-list">
        {fileExplorerItems.map((item) => (
          <div key={item.id} className="file-row">
            <strong>{item.label}</strong>
            <span>{item.path}</span>
            <small>{item.kind}</small>
          </div>
        ))}
      </div>
    </section>
  );
}
`
  );
}
