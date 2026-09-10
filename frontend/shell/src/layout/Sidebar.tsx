import { remoteEntryPoints } from "../router/routes.registry";

export function Sidebar() {
  return (
    <nav className="app-shell-sidebar">
      {remoteEntryPoints.map((entry) => (
        <a key={entry.name} href={entry.pathPrefix}>
          {entry.label}
        </a>
      ))}
    </nav>
  );
}
