type ErrorSnapshot = {
  message: string;
  stack?: string;
  componentStack?: string;
};

export type DiagnosticsSnapshot = {
  appName: string;
  appVersion: string;
  buildTime?: string;
  mode?: string;
  userAgent?: string;
  platform?: string;
  language?: string;
  viewport?: { width: number; height: number };
  url?: string;
  error?: ErrorSnapshot;
  notes?: Record<string, string>;
};

const linesFromObject = (title: string, values: Record<string, unknown>) => {
  const lines: string[] = [];
  lines.push(`[${title}]`);
  Object.entries(values).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    lines.push(`${key}: ${String(value)}`);
  });
  return lines;
};

export const buildDiagnosticsText = (snapshot: DiagnosticsSnapshot) => {
  const lines: string[] = [];
  lines.push("PinForge Diagnostics");
  lines.push(`generatedAt: ${new Date().toISOString()}`);
  lines.push("");
  lines.push(
    ...linesFromObject("App", {
      appName: snapshot.appName,
      appVersion: snapshot.appVersion,
      buildTime: snapshot.buildTime,
      mode: snapshot.mode,
    }),
  );
  lines.push("");
  lines.push(
    ...linesFromObject("Environment", {
      platform: snapshot.platform,
      language: snapshot.language,
      userAgent: snapshot.userAgent,
      url: snapshot.url,
      viewport: snapshot.viewport ? `${snapshot.viewport.width}x${snapshot.viewport.height}` : undefined,
    }),
  );

  if (snapshot.notes && Object.keys(snapshot.notes).length > 0) {
    lines.push("");
    lines.push(...linesFromObject("Notes", snapshot.notes));
  }

  if (snapshot.error) {
    lines.push("");
    lines.push("[Error]");
    lines.push(`message: ${snapshot.error.message}`);
    if (snapshot.error.stack) {
      lines.push("");
      lines.push("stack:");
      lines.push(snapshot.error.stack);
    }
    if (snapshot.error.componentStack) {
      lines.push("");
      lines.push("componentStack:");
      lines.push(snapshot.error.componentStack);
    }
  }

  return lines.join("\n");
};

