export const onRequest = async ({ request, env }: any) => {
    const url = new URL(request.url);

    // If the request is for a specific static file (like .js, .css, .png), 
    // let Cloudflare serve it normally.
    // If it's a file with an extension, OR the view/loading fallback, serve normally.
    if (url.pathname.includes('.') || url.pathname.includes('/view')) {
        return env.ASSETS.fetch(request);
    }

    // Rewrite any /idea/* to /idea/fallback.html (the static fallback)
    const rewriteUrl = new URL("/idea/fallback.html", url.origin);
    return env.ASSETS.fetch(rewriteUrl);
};
