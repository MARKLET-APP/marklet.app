import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./mobile.css";

const rootEl = document.getElementById("root");
if (rootEl) {
  createRoot(rootEl).render(<App />);
}
