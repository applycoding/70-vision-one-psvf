import { env } from "cloudflare:workers";

type FactoryEnv = {
  FACTORY: Fetcher;
};

function factory(): Fetcher {
  const binding = (env as unknown as FactoryEnv).FACTORY;
  if (!binding) {
    throw new Error("FACTORY service binding is not configured.");
  }
  return binding;
}

export async function pipeline(path: string, init?: RequestInit): Promise<Response> {
  return factory().fetch(new Request(new URL(path, "https://pipeline.internal"), init));
}
