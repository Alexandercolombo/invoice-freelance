/**
 * @fileoverview This is a server-only route handler for file uploads.
 */

import { createRouteHandler } from "uploadthing/next";
import { ourFileRouter } from "./core";

// Export routes for Next App Router
export const { GET, POST } = createRouteHandler({
  router: ourFileRouter,
}); 