import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const { images } = await req.json();

        if (!Array.isArray(images) || images.length === 0) {
            return new Response(
                JSON.stringify({ error: "Missing images array" }),
                {
                    status: 400,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }

        const apiKey = Deno.env.get("GOOGLE_VISION_API_KEY");
        if (!apiKey) {
            return new Response(
                JSON.stringify({ error: "Missing GOOGLE_VISION_API_KEY secret" }),
                {
                    status: 500,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }

        const visionRes = await fetch(
            `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    requests: images.map((img) => ({
                        image: { content: img },
                        features: [{ type: "DOCUMENT_TEXT_DETECTION" }],
                    })),
                }),
            }
        );

        const visionJson = await visionRes.json();

        if (!visionRes.ok) {
            return new Response(
                JSON.stringify({
                    error: "Google Vision request failed",
                    details: visionJson,
                }),
                {
                    status: 500,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }

        const responses = visionJson.responses || [];
        const pages = responses.map((response: any) => {
            const page = response.fullTextAnnotation?.pages?.[0];
            const width = page?.width || 1;
            const height = page?.height || 1;
            const words = (page?.blocks || []).flatMap((block: any) =>
                (block.paragraphs || []).flatMap((paragraph: any) =>
                    (paragraph.words || []).map((word: any) => {
                        const vertices = word.boundingBox?.vertices || [];
                        if (vertices.length < 4) return null;
                        const xs = vertices.map((point: any) => (point.x || 0) / width);
                        const ys = vertices.map((point: any) => (point.y || 0) / height);
                        return {
                            text: (word.symbols || []).map((symbol: any) => symbol.text || "").join(""),
                            confidence: word.confidence ?? 0,
                            angle: Math.atan2(ys[1] - ys[0], xs[1] - xs[0]),
                            textHeight: Math.hypot(xs[3] - xs[0], ys[3] - ys[0]),
                            box: { x: Math.min(...xs), y: Math.min(...ys),
                                width: Math.max(...xs) - Math.min(...xs),
                                height: Math.max(...ys) - Math.min(...ys) },
                        };
                    }).filter(Boolean)
                )
            );
            return { text: response.fullTextAnnotation?.text || response.textAnnotations?.[0]?.description || "",
                words, error: response.error ? "The scan reader could not read this page. Review it manually." : "" };
        });
        const texts = responses.map(
            (r: any) =>
                r.fullTextAnnotation?.text ||
                r.textAnnotations?.[0]?.description ||
                ""
        );

        return new Response(
            JSON.stringify({ texts, pages, pipelineVersion: "google-document-layout-v3" }),
            {
                status: 200,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
        );
    } catch (error) {
        return new Response(
            JSON.stringify({
                error: error instanceof Error ? error.message : "Unknown error",
            }),
            {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
        );
    }
});