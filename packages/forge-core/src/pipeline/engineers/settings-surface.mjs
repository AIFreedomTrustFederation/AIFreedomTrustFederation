import { join } from "node:path";
import { writeFileOnce } from "./shared.mjs";

export function buildSettingsSurface({ webRoot }) {
  writeFileOnce(
    join(webRoot, "components/SettingsSurface.tsx"),
    `const settings = [
  {
    key: "localFirst",
    label: "Local-first mode",
    value: "enabled"
  },
  {
    key: "publicMirror",
    label: "Public mirror",
    value: "optional"
  },
  {
    key: "aiProviders",
    label: "AI providers",
    value: "disabled by default"
  },
  {
    key: "provenance",
    label: "Prompt and model provenance",
    value: "required"
  }
];

export function SettingsSurface() {
  return (
    <section className="panel">
      <h2>Settings</h2>
      <p className="muted">BookSmith Federation OS operating principles.</p>

      <div className="settings-list">
        {settings.map((setting) => (
          <div key={setting.key} className="setting-row">
            <strong>{setting.label}</strong>
            <span>{setting.value}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
`
  );
}
