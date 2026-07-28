import {
  OwnerServiceError
} from "../services/owner.service.js";

export type OwnerNotFoundResponse = {
  data: null;
  error: {
    code: "OWNER_NOT_FOUND";
    message: string;
  };
};

export type OwnerErrorMapping = {
  statusCode: 404;
  body: OwnerNotFoundResponse;
};

export function mapOwnerError(
  error: unknown
): OwnerErrorMapping | null {
  if (!(error instanceof OwnerServiceError)) {
    return null;
  }

  switch (error.code) {
    case "OWNER_NOT_FOUND":
      return {
        statusCode: 404,
        body: {
          data: null,
          error: {
            code: "OWNER_NOT_FOUND",
            message: error.message
          }
        }
      };

    default:
      return null;
  }
}
