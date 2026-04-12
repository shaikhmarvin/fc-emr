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

        const texts = (visionJson.responses || []).map(
            (r: any) =>
                r.fullTextAnnotation?.text ||
                r.textAnnotations?.[0]?.description ||
                ""
        );

        return new Response(
            JSON.stringify({ texts }),
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