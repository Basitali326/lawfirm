export function normalizeError(error) {
  if (!error) {
    return { message: "Request failed.", fieldErrors: [], status: null };
  }

  // Axios-style error wrapper
  if (error.__fromAxios) {
    return normalizeError({
      message: error.message,
      data: error.data,
      status: error.status,
      errors: error.errors,
      code: error.code,
      details: error.details,
    });
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
      const mappedField = field === "non_field_errors" ? "_global" : field;
      fieldErrors.push({ field: mappedField, message });
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

  if (error.error && typeof error.error === "object") {
    const errObj = error.error;
    return {
      message: errObj.message || "Request failed.",
      fieldErrors: [],
      status: error.status ?? null,
      code: errObj.code,
      details: errObj.details,
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

// Converts axios errors into a shape consumable by normalizeError.
export function shapeAxiosError(error) {
  if (error?.response) {
    return {
      __fromAxios: true,
      message: error.response.data?.error?.message
        || error.response.data?.detail
        || error.response.data?.message
        || error.message
        || "Request failed.",
      data: error.response.data?.error?.details || error.response.data,
      status: error.response.status,
      errors: error.response.data?.errors || error.response.data?.error?.details,
      code: error.response.data?.error?.code,
      details: error.response.data?.error?.details,
    };
  }
  return error;
}

export function getApiErrorMessage(error) {
  const { message } = normalizeError(error);
  return message;
}
