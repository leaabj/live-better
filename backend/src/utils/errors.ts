import { Context } from "hono";
import { HTTP_STATUS, ERROR_MESSAGES } from "../config/constants";

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = HTTP_STATUS.INTERNAL_SERVER_ERROR,
    public code?: string,
  ) {
    super(message);
    this.name = "AppError";
    Error.captureStackTrace(this, this.constructor);
  }
}

export const ErrorResponse = {
  send(
    c: Context,
    message: string,
    statusCode: number = HTTP_STATUS.INTERNAL_SERVER_ERROR,
  ) {
    return c.json({ success: false, error: message }, statusCode as any);
  },

  unauthorized(c: Context, message: string = ERROR_MESSAGES.UNAUTHORIZED) {
    return c.json({ success: false, error: message }, 401);
  },

  badRequest(c: Context, message: string) {
    return c.json({ success: false, error: message }, 400);
  },

  notFound(c: Context, message: string) {
    return c.json({ success: false, error: message }, 404);
  },

  conflict(c: Context, message: string) {
    return c.json({ success: false, error: message }, 409);
  },

  internal(c: Context, message: string = "Internal server error") {
    return c.json({ success: false, error: message }, 500);
  },

  validation(c: Context, errors: string[]) {
    return c.json(
      {
        success: false,
        error: ERROR_MESSAGES.VALIDATION_ERROR,
        details: errors,
      },
      400,
    );
  },
};

export const SuccessResponse = {
  send(
    c: Context,
    data: any,
    message?: string,
    statusCode: number = HTTP_STATUS.OK,
  ) {
    const response: any = { success: true, data };
    if (message) {
      response.message = message;
    }
    return c.json(response, statusCode as any);
  },

  created(c: Context, data: any, message?: string) {
    return SuccessResponse.send(c, data, message, 201);
  },

  ok(c: Context, data: any, message?: string) {
    return SuccessResponse.send(c, data, message, 200);
  },
};

export function asyncHandler(
  fn: (c: Context) => Promise<Response>,
): (c: Context) => Promise<Response> {
  return async (c: Context) => {
    try {
      return await fn(c);
    } catch (error) {
      console.error("Async handler error:", error);

      if (error instanceof AppError) {
        return ErrorResponse.send(c, error.message, error.statusCode);
      }

      return ErrorResponse.internal(c, "An unexpected error occurred");
    }
  };
}
