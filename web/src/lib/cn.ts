import { clsx, type ClassValue } from "clsx";

// Single util to merge conditional class names. Keeps surface area tiny.
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}
