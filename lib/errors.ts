export type ErrorCode =
  | "UNAUTHORIZED"
  | "RATE_LIMITED"
  | "SERVER_ERROR"
  | "NETWORK_ERROR"
  | "UNKNOWN";

export interface AppError {
  code: ErrorCode;
  message: string;
  retryable: boolean;
}

export function mapError(err: unknown): AppError {
  if (
    typeof err === "object" &&
    err !== null &&
    "status" in err &&
    typeof (err as { status: unknown }).status === "number"
  ) {
    const status = (err as { status: number }).status;
    if (status === 401 || status === 403) {
      return {
        code: "UNAUTHORIZED",
        message: "Invalid API key.",
        retryable: false,
      };
    }
    if (status === 429) {
      return {
        code: "RATE_LIMITED",
        message: "Rate limit reached. Try again shortly.",
        retryable: true,
      };
    }
    return {
      code: "SERVER_ERROR",
      message: "Upstream service error.",
      retryable: true,
    };
  }

  if (err instanceof Error && err.name === "AbortError") {
    return {
      code: "NETWORK_ERROR",
      message: "Request cancelled.",
      retryable: false,
    };
  }

  return {
    code: "UNKNOWN",
    message: "An unexpected error occurred.",
    retryable: true,
  };
}
