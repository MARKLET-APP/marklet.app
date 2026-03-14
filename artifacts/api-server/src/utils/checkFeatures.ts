import type { Express, Router } from "express";

interface RouteInfo {
  method: string;
  path: string;
}

function extractRoutes(stack: any[], prefix = ""): RouteInfo[] {
  const routes: RouteInfo[] = [];

  for (const layer of stack) {
    if (layer.route) {
      const methods = Object.keys(layer.route.methods)
        .filter((m) => layer.route.methods[m])
        .map((m) => m.toUpperCase());
      for (const method of methods) {
        routes.push({ method, path: prefix + layer.route.path });
      }
    } else if (layer.name === "router" && layer.handle?.stack) {
      const mountPath = layer.regexp?.source
        .replace("^\\", "")
        .replace("\\/?(?=\\/|$)", "")
        .replace(/\\\//g, "/") ?? "";
      routes.push(...extractRoutes(layer.handle.stack, prefix + mountPath));
    }
  }

  return routes;
}

const METHOD_COLORS: Record<string, string> = {
  GET:    "\x1b[32m",
  POST:   "\x1b[34m",
  PATCH:  "\x1b[33m",
  PUT:    "\x1b[33m",
  DELETE: "\x1b[31m",
};
const RESET = "\x1b[0m";
const DIM   = "\x1b[2m";
const BOLD  = "\x1b[1m";

export function checkFeatures(app: Express): void {
  const router: Router | undefined =
    (app as any)._router ?? (app as any).router;

  if (!router) {
    console.warn("checkFeatures: no router found on app");
    return;
  }

  const routes = extractRoutes((router as any).stack ?? []);

  const groups: Record<string, RouteInfo[]> = {};
  for (const r of routes) {
    const tag = r.path.split("/")[2] ?? "root";
    (groups[tag] ??= []).push(r);
  }

  const totalWidth = 60;
  console.log(`\n${BOLD}┌${"─".repeat(totalWidth - 2)}┐${RESET}`);
  console.log(`${BOLD}│${" ".repeat(Math.floor((totalWidth - 18) / 2))}✓ API Features Ready${" ".repeat(Math.ceil((totalWidth - 18) / 2))}│${RESET}`);
  console.log(`${BOLD}├${"─".repeat(totalWidth - 2)}┤${RESET}`);

  for (const [group, groupRoutes] of Object.entries(groups)) {
    console.log(`${BOLD}│  ${group.toUpperCase().padEnd(totalWidth - 5)}│${RESET}`);
    for (const { method, path } of groupRoutes) {
      const color = METHOD_COLORS[method] ?? "\x1b[37m";
      const methodStr = `${color}${method.padEnd(7)}${RESET}`;
      const line = `│    ${methodStr} ${DIM}${path}${RESET}`;
      const visibleLen = 4 + method.padEnd(7).length + 1 + path.length;
      const padding = Math.max(0, totalWidth - 2 - visibleLen);
      console.log(`${line}${" ".repeat(padding)}│`);
    }
    console.log(`${BOLD}│${" ".repeat(totalWidth - 2)}│${RESET}`);
  }

  console.log(`${BOLD}│  ${DIM}${routes.length} endpoints registered${RESET}${BOLD}${" ".repeat(totalWidth - 4 - String(routes.length).length - 21)}│${RESET}`);
  console.log(`${BOLD}└${"─".repeat(totalWidth - 2)}┘${RESET}\n`);
}
