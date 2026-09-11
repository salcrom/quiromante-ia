type VisionRequest = {
  imageId: string;
  expectedHandSide: "left" | "right";
  mimeType: string;
  imageBase64: string;
};

type VisionResult = {
  imageId: string;
  accepted: boolean;
  confidence: number;
  anatomy: {
    palmDetected: boolean;
    fullPalmVisible: boolean;
    fingersVisible: number;
    wristVisible: boolean;
    expectedHandSide: "left" | "right" | "unknown";
    detectedHandSide: "left" | "right" | "unknown";
  };
  issues: string[];
  notes: string[];
  validatorVersion: string;
};

function extractOutputText(payload: unknown) {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;
  if (typeof record.output_text === "string") return record.output_text;
  const output = Array.isArray(record.output) ? record.output : [];
  for (const item of output) {
    if (!item || typeof item !== "object") continue;
    const content = Array.isArray((item as Record<string, unknown>).content)
      ? ((item as Record<string, unknown>).content as unknown[])
      : [];
    for (const part of content) {
      if (!part || typeof part !== "object") continue;
      const p = part as Record<string, unknown>;
      if (p.type === "output_text" && typeof p.text === "string") return p.text;
    }
  }
  return null;
}

export async function validatePalmWithOpenAI(input: VisionRequest): Promise<VisionResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_VISION_MODEL;
  if (!apiKey || !model) throw new Error("OPENAI_VISION_NOT_CONFIGURED");

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({
      model,
      store: false,
      input: [{
        role: "user",
        content: [
          {
            type: "input_text",
            text: `Validate this palm capture for downstream image analysis. Expected side: ${input.expectedHandSide}. Require one clear palm, substantially complete palm, five visible fingers, visible wrist/base, matching hand side, no major occlusion, and no extreme perspective. Return JSON with imageId, accepted, confidence, anatomy, issues, notes, validatorVersion. imageId=${input.imageId}`,
          },
          { type: "input_image", image_url: `data:${input.mimeType};base64,${input.imageBase64}`, detail: "high" },
        ],
      }],
      text: { format: { type: "json_object" } },
    }),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`OPENAI_VISION_REQUEST_FAILED:${response.status}`);
  const outputText = extractOutputText(payload);
  if (!outputText) throw new Error("OPENAI_VISION_EMPTY_OUTPUT");
  return JSON.parse(outputText) as VisionResult;
}
