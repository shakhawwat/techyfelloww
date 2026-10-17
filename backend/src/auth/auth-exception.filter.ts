import {clearSessionCookie} from './auth-http';
import { ArgumentsHost, Catch, HttpException, type ExceptionFilter } from "@nestjs/common";
import type { Request, Response } from "express";
@Catch()
export class AuthExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const requested = exception instanceof HttpException ? exception.getStatus() : 500;
    // Preserve the existing bounded readiness response; sanitize parser/unguarded errors globally.
    const request = host.switchToHttp().getRequest<Request>();
    if (/^\/api\/v1\/health\/ready\/?$/.test(request.path) && requested === 503) {
      host.switchToHttp().getResponse<Response>().status(503).json({ status: "unavailable" });
      return;
    }
    const errors: Record<number, { code: string; message: string }> = {
      400: { code: "BAD_REQUEST", message: "Invalid request parameters." },
      401: { code: "UNAUTHORIZED", message: "Authentication required or invalid credentials." },
      403: { code: "FORBIDDEN", message: "Access denied." },
      404: { code: "NOT_FOUND", message: "Resource not found." },
      409: {code:"CONFLICT",message:"Saved state conflicts with this request. Reload and try again."},
      413: { code: "PAYLOAD_TOO_LARGE", message: "Request body is too large." },
      429: { code: "TOO_MANY_REQUESTS", message: "Too many login attempts. Try again later." },
      503: { code: "SERVICE_UNAVAILABLE", message: "Authentication is temporarily unavailable." },
      500: { code: "INTERNAL_ERROR", message: "An unexpected error occurred." },
    };
    const status = Object.hasOwn(errors, requested) ? requested : 500;
    const response = host.switchToHttp().getResponse<Response>();
    response.setHeader("Cache-Control", "no-store");
    if(status===401&&request.path==="/api/v1/auth/logout")clearSessionCookie(response,process.env.NODE_ENV==="production");
    if(status===401&&request.path==="/api/v1/account/logout")clearSessionCookie(response,process.env.NODE_ENV==="production",true);
    if (status === 429) response.setHeader("Retry-After", "900");
    response.status(status).json({ error: errors[status] });
  }
}
