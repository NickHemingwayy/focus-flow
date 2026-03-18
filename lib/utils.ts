import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function b64ToUint8Array(base64: string | null) {
  if (!base64) return new Uint8Array();
  const asCharCode = (c: string) => c.charCodeAt(0);
  return Uint8Array.from(atob(base64), asCharCode);
}

export function Uint8ArrayTob64(uint8array: Uint8Array) {
  const output = [];
  for (let i = 0, { length } = uint8array; i < length; i++)
    output.push(String.fromCharCode(uint8array[i]));
  return btoa(output.join(""));
}

export function Uint8ArrayToHex(uint8array: Uint8Array) {
  return (
    "\\x" + uint8array.reduce((s, n) => s + n.toString(16).padStart(2, "0"), "")
  );
}

export function b64ToHex(str: string) {
  const raw = atob(str);
  let result = "\\x";
  for (let i = 0; i < raw.length; i++) {
    const hex = raw.charCodeAt(i).toString(16);
    result += hex.length === 2 ? hex : "0" + hex;
  }
  return result;
}

export function hexToUint8Array(hexString: string) {
  return Uint8Array.from(
    hexString
      .replace("\\x", "")
      .match(/.{1,2}/g)
      ?.map((byte) => parseInt(byte, 16)) ?? [],
  );
}

// Date helpers
export function formatRelativeTime(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const date = dayjs(dateStr);
  if (!date.isValid()) return "";
  if (dayjs().diff(date, "month") >= 1)
    return date.format("MMM D, YYYY, h:mm A");
  return date.fromNow();
}
