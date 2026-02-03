export function normalizeError(error) {
  if (!error) {
    return { message: "Request failed.", fieldErrors: [], status: null };
  }

  if (error.errors && Array.isArray(error.errors)) {
    return {
      message: error.errors.map((e) => e.message).join(" "),
      fieldErrors: error.errors,
      status: error.status ?? null,
    };
  }

  if (error.data && typeof error.data === "object" && !Array.isArray(error.data)) {
    const fieldErrors = [];
    for (const [field, messages] of Object.entries(error.data)) {
      const message = Array.isArray(messages) ? messages.join(" ") : String(messages);
      fieldErrors.push({ field, message });
    }
    return {
      message: fieldErrors.map((e) => e.message).join(" ") || error.message,
      fieldErrors,
      status: error.status ?? null,
    };
  }

  if (error.data && Array.isArray(error.data.errors)) {
    return {
      message: error.data.errors.map((e) => e.message).join(" "),
      fieldErrors: error.data.errors,
      status: error.status ?? null,
    };
  }

  if (typeof error === "string") {
    return { message: error, fieldErrors: [], status: null };
  }

  return {
    message: error.message || "Request failed.",
    fieldErrors: [],
    status: error.status ?? null,
  };
}

export function mapFieldErrors(fieldErrors) {
  const result = {};
  for (const err of fieldErrors || []) {
    if (!err.field) continue;
    result[err.field] = err.message;
  }
  return result;
}
