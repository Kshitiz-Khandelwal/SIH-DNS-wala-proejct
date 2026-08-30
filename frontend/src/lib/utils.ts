import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function truncateHash(hash: string, length = 8): string {
  if (hash.length <= length * 2 + 3) return hash;
  return `${hash.slice(0, length)}…${hash.slice(-length)}`;
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

/**
 * Sanitizes arbitrary URL / domain inputs by stripping protocols, ports, and paths.
 * E.g. "https://rnicrosoft.com:8080/login?q=1" -> "rnicrosoft.com"
 * E.g. "http://localhost:3000/app/queue" -> "localhost"
 */
export function sanitizeDomain(input: string): string {
  if (!input) return "";
  let clean = input.trim().toLowerCase();
  // Strip scheme (http://, https://, udp://, etc.)
  clean = clean.replace(/^[a-zA-Z0-9+.-]+:\/\//, "");
  // Strip path and query parameters
  clean = clean.split("/")[0];
  // Strip port
  clean = clean.split(":")[0];
  clean = clean.split("?")[0];
  clean = clean.split("#")[0];
  return clean.trim();
}
