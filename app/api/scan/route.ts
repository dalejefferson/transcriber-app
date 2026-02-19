import { NextResponse } from "next/server";
import * as net from "net";
import * as os from "os";

interface Server {
  ip: string;
  port: number;
  status: "open";
  serverHeader: string | null;
  title: string | null;
}

const COMMON_PORTS = [80, 443, 3000, 3001, 5000, 5173, 8000, 8080, 8443, 8888];
const BATCH_SIZE = 50;
const TCP_TIMEOUT = 300;
const HTTP_TIMEOUT = 500;

function getLocalIp(): string | null {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    const addrs = interfaces[name];
    if (!addrs) continue;
    for (const addr of addrs) {
      if (addr.family === "IPv4" && !addr.internal) {
        return addr.address;
      }
    }
  }
  return null;
}

function getSubnetBase(ip: string): string {
  const parts = ip.split(".");
  return `${parts[0]}.${parts[1]}.${parts[2]}`;
}

function checkPort(ip: string, port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(TCP_TIMEOUT);
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("timeout", () => {
      socket.destroy();
      resolve(false);
    });
    socket.once("error", () => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(port, ip);
  });
}

async function probeHttp(
  ip: string,
  port: number
): Promise<{ serverHeader: string | null; title: string | null }> {
  const protocol = port === 443 || port === 8443 ? "https" : "http";
  const url = `${protocol}://${ip}:${port}/`;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), HTTP_TIMEOUT);
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "manual",
    });
    clearTimeout(timer);
    const serverHeader = res.headers.get("server") || null;
    let title: string | null = null;
    try {
      const text = await res.text();
      const match = text.match(/<title[^>]*>([^<]+)<\/title>/i);
      if (match) title = match[1].trim();
    } catch {
      // ignore body read errors
    }
    return { serverHeader, title };
  } catch {
    return { serverHeader: null, title: null };
  }
}

async function runBatch<T>(
  tasks: (() => Promise<T>)[],
  batchSize: number
): Promise<T[]> {
  const results: T[] = [];
  for (let i = 0; i < tasks.length; i += batchSize) {
    const batch = tasks.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map((fn) => fn()));
    results.push(...batchResults);
  }
  return results;
}

export async function POST() {
  const startTime = performance.now();

  const localIp = getLocalIp();
  if (!localIp) {
    return NextResponse.json(
      { error: "Could not determine local IP address" },
      { status: 500 }
    );
  }

  const subnetBase = getSubnetBase(localIp);
  const subnet = `${subnetBase}.0/24`;

  // Build list of all host+port combinations to scan
  const scanTasks: (() => Promise<{
    ip: string;
    port: number;
    open: boolean;
  }>)[] = [];

  for (let host = 1; host <= 254; host++) {
    const ip = `${subnetBase}.${host}`;
    for (const port of COMMON_PORTS) {
      scanTasks.push(async () => ({
        ip,
        port,
        open: await checkPort(ip, port),
      }));
    }
  }

  // Run port scans in batches
  const scanResults = await runBatch(scanTasks, BATCH_SIZE);
  const openPorts = scanResults.filter((r) => r.open);

  // Probe open ports for HTTP info in batches
  const probeTasks = openPorts.map(
    ({ ip, port }) =>
      async (): Promise<Server> => {
        const { serverHeader, title } = await probeHttp(ip, port);
        return { ip, port, status: "open", serverHeader, title };
      }
  );

  const servers = await runBatch(probeTasks, BATCH_SIZE);

  const scanDuration =
    Math.round(((performance.now() - startTime) / 1000) * 10) / 10;

  return NextResponse.json({
    localIp,
    subnet,
    scanDuration,
    servers,
  });
}
