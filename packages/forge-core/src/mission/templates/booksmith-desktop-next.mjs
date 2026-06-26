export const missionTemplate = {
  id: "booksmith-desktop-layer-2",
  title: "Build BookSmith Desktop Layer 2",
  targetRepository: "BookSmith-Federation-OS",
  authorityLevel: 2,
  risk: "low",
  scope: [
    "Notification Center",
    "File Explorer",
    "Terminal Surface",
    "Search Palette",
    "Status Bar"
  ],
  limits: {
    mayCreateFiles: true,
    mayModifyExistingUi: true,
    mayModifyExistingApi: false,
    mayDeleteFiles: false,
    mayTouchOtherRepositories: false,
    mayInstallDependencies: false,
    mayCommitAutomatically: false
  },
  tasks: [
    {
      id: "notification-center",
      title: "Build Notification Center",
      status: "ready",
      dependsOn: [],
      files: [
        "apps/web-os/components/NotificationCenter.tsx",
        "apps/web-os/lib/notification-registry.ts"
      ]
    },
    {
      id: "file-explorer",
      title: "Build File Explorer",
      status: "queued",
      dependsOn: ["notification-center"],
      files: [
        "apps/web-os/components/FileExplorer.tsx",
        "apps/web-os/lib/file-explorer-registry.ts"
      ]
    },
    {
      id: "terminal-surface",
      title: "Build Terminal Surface",
      status: "queued",
      dependsOn: ["file-explorer"],
      files: [
        "apps/web-os/components/TerminalSurface.tsx",
        "apps/web-os/lib/terminal-commands.ts"
      ]
    },
    {
      id: "search-palette",
      title: "Build Search Palette",
      status: "queued",
      dependsOn: ["terminal-surface"],
      files: [
        "apps/web-os/components/SearchPalette.tsx",
        "apps/web-os/lib/search-index.ts"
      ]
    },
    {
      id: "status-bar",
      title: "Build Status Bar",
      status: "queued",
      dependsOn: ["search-palette"],
      files: [
        "apps/web-os/components/StatusBar.tsx",
        "apps/web-os/lib/status-registry.ts"
      ]
    }
  ]
};
