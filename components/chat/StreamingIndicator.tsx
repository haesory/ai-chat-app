"use client";

export function StreamingIndicator() {
  return (
    <div className="flex items-center gap-1 px-4 py-2" aria-label="AI is typing" aria-live="polite">
      <span className="size-2 animate-bounce rounded-full bg-foreground/40 [animation-delay:0ms]" />
      <span className="size-2 animate-bounce rounded-full bg-foreground/40 [animation-delay:150ms]" />
      <span className="size-2 animate-bounce rounded-full bg-foreground/40 [animation-delay:300ms]" />
    </div>
  );
}
