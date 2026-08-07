import type * as React from "react";
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Point several refs at one node.
 *
 * A `forwardRef` component that also needs the node itself has two claims on a
 * single `ref` attribute, and the last one written wins. `Tooltip` needs the
 * trigger element to tell an outside tap from a tap on the trigger; `Sheet`
 * needs the panel's height to know when a drag has passed the dismiss
 * threshold. Both must still hand the node to whatever the caller passed.
 *
 * Radix ships this as `@radix-ui/react-compose-refs`, but it is a transitive
 * dependency here rather than a declared one, and importing it directly would
 * make every Radix version bump able to break a build silently.
 */
export function composeRefs<T>(...refs: (React.Ref<T> | undefined)[]) {
  return (node: T | null) => {
    for (const ref of refs) {
      if (typeof ref === "function") ref(node);
      else if (ref) (ref as React.MutableRefObject<T | null>).current = node;
    }
  };
}
