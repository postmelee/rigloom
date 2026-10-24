import { defineConfig } from "vite";
export default defineConfig({
  plugins: [
    {
      name: "development-style-policy",
      transformIndexHtml(html, context) {
        // Vite injects development CSS into style elements. Built CSS stays same-origin.
        return context.server
          ? html.replace("style-src 'self'", "style-src 'self' 'unsafe-inline'")
          : html;
      },
    },
  ],
});
