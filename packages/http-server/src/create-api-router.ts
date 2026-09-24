import express, { type Router } from "express";

/** Create an isolated Express router for a route module. */
export function createServiceRouter(): Router {
  return express.Router();
}

/**
 * A route module owns one slice of the HTTP surface (health, public auth, tenant-scoped API, …).
 * It receives shared dependencies and returns an Express router. Modules must not mutate global state.
 */
export type RouteModule<TContext> = (context: TContext) => Router;

/**
 * Compose service route modules into a single API router mounted by {@link createPlatformApp}.
 * Keeps middleware order and route wiring in the service; the platform package only runs the stack.
 */
export function createApiRouter<TContext>(
  context: TContext,
  modules: ReadonlyArray<RouteModule<TContext>>,
): Router {
  const api = express.Router();
  for (const module of modules) {
    api.use(module(context));
  }
  return api;
}
