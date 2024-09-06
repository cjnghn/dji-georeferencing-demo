import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import DroneVideoOverlayApp from "./DroneVideoOverlayApp.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <DroneVideoOverlayApp />
  </StrictMode>
);
