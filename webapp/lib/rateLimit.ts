/**
 * Rate limiting simples em memória.
 *
 * Suficiente para o AC Fácil, que roda numa única instância no Railway.
 * Se um dia o serviço escalar para várias réplicas, cada uma terá sua
 * própria contagem — nesse caso vale migrar para Redis ou similar.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Map<string, Bucket>>();

/** Remove entradas expiradas para a memória não crescer indefinidamente. */
function sweep(store: Map<string, Bucket>, now: number) {
  if (store.size < 500) return;
  for (const [key, b] of store) {
    if (now > b.resetAt) store.delete(key);
  }
}

export type RateLimitResult = {
  allowed: boolean;
  retryAfterSec: number;
};

/**
 * @param scope   Nome da rota (buckets separados por rota).
 * @param key     Identificador do cliente (normalmente o IP).
 * @param max     Máximo de requisições na janela.
 * @param windowMs Duração da janela em milissegundos.
 */
export function rateLimit(
  scope: string,
  key: string,
  max: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();

  let store = buckets.get(scope);
  if (!store) {
    store = new Map();
    buckets.set(scope, store);
  }
  sweep(store, now);

  const bucket = store.get(key);

  if (!bucket || now > bucket.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSec: 0 };
  }

  if (bucket.count >= max) {
    return { allowed: false, retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000) };
  }

  bucket.count += 1;
  return { allowed: true, retryAfterSec: 0 };
}

/** Zera a contagem de um cliente (ex.: após login bem-sucedido). */
export function resetRateLimit(scope: string, key: string) {
  buckets.get(scope)?.delete(key);
}

/** Extrai o IP do cliente considerando o proxy do Railway. */
export function clientIp(req: Request): string {
  const h = req.headers;
  return (
    h.get("x-forwarded-for")?.split(",")[0].trim() ||
    h.get("x-real-ip") ||
    "unknown"
  );
}
