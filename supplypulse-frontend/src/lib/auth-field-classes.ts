/**
 * Shared Tailwind classes for login / signup inputs: strong contrast while typing,
 * plus webkit-autofill tweaks so browsers don’t render pale text over yellow fill.
 */
export const AUTH_TEXT_INPUT_CLASS =
  [
    "mt-1 block w-full rounded-lg border px-3 py-2 text-sm",
    "border-slate-300 bg-white text-black caret-zinc-900",
    "placeholder:text-slate-500",
    "focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500",
    // WebKit autofill readability (Chrome / Edge)
    "[&:-webkit-autofill]:shadow-[inset_0_0_0_1000px_rgb(255,255,255)]",
    "[&:-webkit-autofill]:[-webkit-text-fill-color:rgb(10,10,10)]",
    "[&:-webkit-autofill]:caret-zinc-900",
    "dark:border-slate-600 dark:bg-slate-950 dark:text-white dark:caret-white",
    "dark:placeholder:text-slate-500",
    "dark:focus:border-blue-400 dark:focus:ring-blue-400",
    "dark:[&:-webkit-autofill]:shadow-[inset_0_0_0_1000px_rgb(2,6,23)]",
    "dark:[&:-webkit-autofill]:[-webkit-text-fill-color:rgb(245,245,245)]",
    "dark:[&:-webkit-autofill]:caret-white",
  ].join(" ");
