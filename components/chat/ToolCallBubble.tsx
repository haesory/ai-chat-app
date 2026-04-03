"use client";

import { useState } from "react";
import { ChevronRight, Loader2, CheckCircle2, XCircle, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { ToolCallInfo } from "@/lib/types";

interface ToolCallBubbleProps {
  toolCall: ToolCallInfo;
}

export function ToolCallBubble({ toolCall }: ToolCallBubbleProps) {
  const [open, setOpen] = useState(false);

  const isPending = !toolCall.result;
  const isError = toolCall.result?.isError;

  const resultText = toolCall.result?.content
    ?.filter((p) => p.type === "text" && p.text)
    .map((p) => p.text)
    .join("\n");

  return (
    <div className="flex justify-start">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger
          className="flex w-full max-w-[80%] items-center gap-2 rounded-xl border border-foreground/10 bg-foreground/[0.03] px-3 py-2 text-left text-sm transition-colors hover:bg-foreground/[0.06]"
        >
          {isPending ? (
            <Loader2 className="size-4 shrink-0 animate-spin text-blue-500" />
          ) : isError ? (
            <XCircle className="size-4 shrink-0 text-red-500" />
          ) : (
            <CheckCircle2 className="size-4 shrink-0 text-green-500" />
          )}

          <Wrench className="size-3.5 shrink-0 text-foreground/50" />

          <span className="min-w-0 flex-1 truncate font-medium text-foreground/80">
            {toolCall.toolName}
          </span>

          <Badge variant="outline" className="shrink-0 text-[10px]">
            {toolCall.serverName}
          </Badge>

          <ChevronRight
            className={`size-3.5 shrink-0 text-foreground/40 transition-transform ${open ? "rotate-90" : ""}`}
          />
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="mt-1 max-w-[80%] space-y-2 rounded-xl border border-foreground/10 bg-foreground/[0.03] p-3">
            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-foreground/40">
                Arguments
              </p>
              <pre className="overflow-x-auto rounded-lg bg-foreground/[0.05] p-2 font-mono text-xs text-foreground/70">
                {JSON.stringify(toolCall.arguments, null, 2)}
              </pre>
            </div>

            {toolCall.result && (
              <div>
                <div className="mb-1 flex items-center gap-1.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-foreground/40">
                    Result
                  </p>
                  {isError && (
                    <Badge variant="destructive" className="text-[10px]">
                      Error
                    </Badge>
                  )}
                </div>
                <pre className="max-h-60 overflow-auto rounded-lg bg-foreground/[0.05] p-2 font-mono text-xs text-foreground/70">
                  {resultText || "(empty)"}
                </pre>
              </div>
            )}

            {isPending && (
              <div className="flex items-center gap-2 text-xs text-foreground/50">
                <Loader2 className="size-3 animate-spin" />
                도구 실행 중...
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
