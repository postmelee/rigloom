import { defineConfig } from "vite";
import { unriggedFixture } from "./scripts/unrigged-fixture.mjs";
export default defineConfig({
  plugins: [
    {
      name: "original-rigging-example",
      configureServer(server) {
        server.middlewares.use((request, response, next) => {
          if (
            request.url?.split("?")[0] !==
            `${server.config.base}examples/unrigged-standard.glb`
          )
            return next();
          response.setHeader("Content-Type", "model/gltf-binary");
          response.end(unriggedFixture());
        });
      },
      generateBundle() {
        this.emitFile({
          type: "asset",
          fileName: "examples/unrigged-standard.glb",
          source: unriggedFixture(),
        });
      },
    },
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
