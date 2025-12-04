import { authMiddleware } from '@clerk/nextjs';

export default authMiddleware({
  // Public routes that don't require authentication
  publicRoutes: [
    '/',
    '/api/webhooks/clerk',
    '/api/webhooks/stripe',
    '/sign-in(.*)',
    '/sign-up(.*)',
    '/api/health',
  ],
  // Routes that can be accessed with an API key instead of session
  ignoredRoutes: [
    '/api/v1/(.*)', // API routes use API key auth
  ],
});

export const config = {
  matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)'],
};
