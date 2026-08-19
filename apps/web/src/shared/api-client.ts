export type ApiErrorBody = {
  code: string;
  message: string;
};

export type ApiResponse<T> = {
  data: T;
  error: null;
};

export type ApiFailureResponse = {
  data: null;
  error: ApiErrorBody;
};

export class ApiClientError extends Error {
  readonly statusCode: number;
  readonly code: string | null;

  constructor(
    statusCode: number,
    code: string | null,
    message: string
  ) {
    super(message);

    this.name = "ApiClientError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

export async function apiRequest<T>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<T> {
  const response = await fetch(
    input,
    init
  );

  if (!response.ok) {
    let code: string | null = null;
    let message =
      `API request failed with status ${response.status}`;

    try {
      const body =
        await response.json() as
          Partial<ApiFailureResponse>;

      if (
        body.error &&
        typeof body.error.code === "string"
      ) {
        code = body.error.code;
      }

      if (
        body.error &&
        typeof body.error.message === "string"
      ) {
        message = body.error.message;
      }
    } catch {
      // Manteniamo il fallback HTTP generico.
    }

    throw new ApiClientError(
      response.status,
      code,
      message
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const body =
    await response.json() as ApiResponse<T>;

  return body.data;
}
