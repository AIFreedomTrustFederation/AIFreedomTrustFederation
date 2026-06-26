import { join } from "node:path";
import { writeFileOnce } from "./shared.mjs";

export const task = "notification-center";
export const description = "Build the BookSmith Web OS notification center.";

export function run({ webRoot }) {
  writeFileOnce(
    join(webRoot, "lib/notification-registry.ts"),
    `export type NotificationRecord = {
  id: string;
  title: string;
  message: string;
  level: "info" | "warning" | "success";
};

export const notificationRegistry: NotificationRecord[] = [
  {
    id: "welcome",
    title: "BookSmith OS Ready",
    message: "The local-first desktop shell is online.",
    level: "success"
  },
  {
    id: "provenance",
    title: "Provenance Required",
    message: "AI-assisted changes should remain inspectable.",
    level: "info"
  }
];
`
  );

  writeFileOnce(
    join(webRoot, "components/NotificationCenter.tsx"),
    `import { notificationRegistry } from "../lib/notification-registry";

export function NotificationCenter() {
  return (
    <section className="panel">
      <h2>Notifications</h2>
      <div className="notification-list">
        {notificationRegistry.map((item) => (
          <article key={item.id} className="notification-card">
            <strong>{item.title}</strong>
            <p>{item.message}</p>
            <small>{item.level}</small>
          </article>
        ))}
      </div>
    </section>
  );
}
`
  );
}
