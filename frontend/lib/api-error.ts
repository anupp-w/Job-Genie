export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (!error || typeof error !== "object") {
    return fallback;
  }

  const maybeError = error as {
    message?: unknown;
    response?: {
      data?: {
        detail?: unknown;
        message?: unknown;
      };
    };
  };

  const detail = maybeError.response?.data?.detail;
  if (typeof detail === "string" && detail.trim()) {
    return detail.trim();
  }

  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0] as { msg?: unknown };
    if (typeof first?.msg === "string" && first.msg.trim()) {
      return first.msg.trim();
    }
  }

  const message = maybeError.response?.data?.message;
  if (typeof message === "string" && message.trim()) {
    return message.trim();
  }

  if (typeof maybeError.message === "string" && maybeError.message.trim()) {
    return maybeError.message.trim();
  }

  return fallback;
}
