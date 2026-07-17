"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";

// Shared base for the app's most-repeated interactive element (issue #10).
// Owns the .ritual-cta hover/disabled behavior from globals.css; callers keep
// their own bespoke color/size via className+style, same as before.
type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "cta" | "plain";
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "cta", type = "button", className = "", ...props },
  ref,
) {
  const base = variant === "cta" ? "ritual-cta" : "";
  return (
    <button
      ref={ref}
      type={type}
      className={[base, className].filter(Boolean).join(" ")}
      {...props}
    />
  );
});
