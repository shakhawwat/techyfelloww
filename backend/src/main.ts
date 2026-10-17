import "reflect-metadata";
import { json } from "express";
import { BadRequestException, HttpException } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { AuthExceptionFilter } from "./auth/auth-exception.filter";
import { AppModule } from "./app.module";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { abortOnError: false });
  // Install before Nest's default parser; only public inquiries have the tighter wire limit.
  const inquiryJson = json({ limit: 16384 });
  app.use((request: import("express").Request, response: import("express").Response, next: import("express").NextFunction) => {
    if (request.method !== "POST" || !/^\/api\/v1\/leads\/?$/i.test(request.path)) return next();
    inquiryJson(request, response, (error?: { type?: string }) => next(error ? (error.type === "entity.too.large" ? new HttpException("Payload too large", 413) : new BadRequestException()) : undefined));
  });
  app.useGlobalFilters(new AuthExceptionFilter());
  app.setGlobalPrefix("api/v1");
  app.enableShutdownHooks();
  const config = app.get(ConfigService);
  const origins = config.getOrThrow<string[]>("AUTH_ALLOWED_ORIGINS");
  app.enableCors({
    origin: (origin: string | undefined, callback: (error: Error | null, allowed: boolean) => void) => callback(null, origin !== undefined && origins.includes(origin)),
    credentials: true, methods: ["GET", "HEAD", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "X-CSRF-Protection", "X-Techyfellow-Session", "Idempotency-Key"], maxAge: 600,
  });
  const proxies = new Set(config.getOrThrow<string[]>("AUTH_TRUSTED_PROXY_IPS"));
  app.getHttpAdapter().getInstance().set("trust proxy", (ip: string) =>
    proxies.has(ip) || (ip.startsWith("::ffff:") && proxies.has(ip.slice(7))));
  await app.listen(config.getOrThrow<number>("PORT"));
}

bootstrap().catch(() => {
  console.error("Backend startup failed; verify runtime configuration and service availability.");
  process.exitCode = 1;
});
