import { createFileRoute } from "@tanstack/react-router";
import { getDefaultStorage } from "@/lib/storage";

export const Route = createFileRoute("/api/audio/files/$")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        try {
          const { _splat } = params
          const pathSegments = _splat ? _splat.split("/").filter(Boolean) : []

          if (!pathSegments || pathSegments.length === 0) {
            return Response.json(
              { error: "File path is required" },
              { status: 400 },
            );
          }

          const storagePath = pathSegments.join("/");
          const storage = getDefaultStorage();

          const exists = await storage.exists(storagePath);
          if (!exists) {
            return Response.json({ error: "File not found" }, { status: 404 });
          }

          const fileBuffer = await storage.download(storagePath);

          const extension = storagePath.split(".").pop()?.toLowerCase();
          let contentType = "application/octet-stream";

          if (extension === "wav") {
            contentType = "audio/wav";
          } else if (extension === "mp3") {
            contentType = "audio/mpeg";
          } else if (extension === "ogg") {
            contentType = "audio/ogg";
          }

          return new Response(fileBuffer, {
            status: 200,
            headers: {
              "Content-Type": contentType,
              "Content-Length": fileBuffer.length.toString(),
              "Cache-Control": "public, max-age=31536000, immutable",
            },
          });
        } catch (error) {
          console.error("File serve error:", error);
          return Response.json(
            { error: "Failed to serve file" },
            { status: 500 },
          );
        }
      },
    },
  },
});
