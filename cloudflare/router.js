// ============================================
// Minimal path router for Cloudflare Workers
// ============================================
export class Router {
    constructor() {
        this.routes = [];
    }

    options(pattern, handler) {
        this.routes.push({ method: 'OPTIONS', pattern, handler });
    }

    get(pattern, handler) {
        this.routes.push({ method: 'GET', pattern, handler });
    }

    post(pattern, handler) {
        this.routes.push({ method: 'POST', pattern, handler });
    }

    put(pattern, handler) {
        this.routes.push({ method: 'PUT', pattern, handler });
    }

    delete(pattern, handler) {
        this.routes.push({ method: 'DELETE', pattern, handler });
    }

    matchRoute(method, pathname) {
        for (const route of this.routes) {
            if (route.method !== method) continue;

            const params = {};
            const routeParts = route.pattern.split('/').filter(Boolean);
            const pathParts = pathname.split('/').filter(Boolean);

            if (routeParts.length !== pathParts.length) {
                // Allow wildcard '*' to match any remaining path
                if (route.pattern === '*') {
                    return { handler: route.handler, params };
                }
                continue;
            }

            let matched = true;
            for (let i = 0; i < routeParts.length; i++) {
                const part = routeParts[i];
                if (part.startsWith(':')) {
                    params[part.slice(1)] = pathParts[i];
                } else if (part !== pathParts[i]) {
                    matched = false;
                    break;
                }
            }

            if (matched) {
                return { handler: route.handler, params };
            }
        }
        return null;
    }

    async handle(request, env, ctx) {
        const method = request.method;
        const url = new URL(request.url);
        const pathname = url.pathname.replace(/\/$/, '') || '/';

        if (method === 'OPTIONS') {
            const match = this.routes.find(r => r.method === 'OPTIONS');
            if (match) return await match.handler(request, env, ctx);
        }

        const match = this.matchRoute(method, pathname);
        if (match) {
            return await match.handler(request, env, match.params, ctx);
        }

        // Fallback to wildcard GET if no other match
        const fallback = this.matchRoute('GET', '*');
        if (fallback) {
            return await fallback.handler(request, env, fallback.params, ctx);
        }

        return new Response(JSON.stringify({ error: 'Not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
