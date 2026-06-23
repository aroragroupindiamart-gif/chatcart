import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

// Register service worker (PWA — seller dashboard only)
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/app/sw.js", { scope: "/app/" })
      .then((reg) => {
        console.log("[SW] Registered, scope:", reg.scope);
      })
      .catch((err) => {
        console.warn("[SW] Registration failed:", err);
      });
  });
}
