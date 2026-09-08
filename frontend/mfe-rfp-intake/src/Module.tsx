// The exposed remote entry -- this is the one file the shell imports
// (as "rfpIntake/Module"). It carries no routing of its own beyond what
// routes.ts declares; the shell's router decides when this mounts.

import { Routes, Route } from "react-router-dom";
import { routes } from "./routes";

export default function Module() {
  return (
    <Routes>
      {routes.map((route) => (
        <Route key={route.path} path={route.path} element={<route.component />} />
      ))}
    </Routes>
  );
}

export { routes };
