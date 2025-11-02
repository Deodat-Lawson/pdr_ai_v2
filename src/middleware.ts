import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";


const isProtectedRoute = createRouteMatcher([
    '/signup/employer(.*)',
    '/signup/employee(.*)',
    '/employer(.*)',
    '/employee(.*)',
]);


const isPublicRoute = createRouteMatcher([
    '/',
    '/pricing',
    '/deployment',
    '/contact',
    '/about',
    '/signup',
    '/api/webhooks(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
    if (isProtectedRoute(req) && !isPublicRoute(req)) {
        await auth.protect();
    }
});

export const config = {
    matcher: [
        // Skip Next.js internals and all static files, unless found in search params
        '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
        // Always run for API routes
        '/(api|trpc)(.*)',
    ],
};