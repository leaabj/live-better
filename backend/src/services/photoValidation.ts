import OpenAI from "openai";

export interface PhotoValidationResult {
  validated: boolean;
  response: string;
  confidence?: number;
  reasoning?: string;
}

export interface PhotoValidationParams {
  taskTitle: string;
  taskDescription?: string;
  imageBase64: string;
}

export class PhotoValidationService {
  private static getOpenAIInstance(): OpenAI {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OpenAI API key not found for photo validation");
    }
    return new OpenAI({ apiKey });
  }

  static async validateTaskPhoto(
    params: PhotoValidationParams,
  ): Promise<PhotoValidationResult> {
    try {
      const openai = this.getOpenAIInstance();

      // Remove the data URL prefix to get pure base64
      const base64Image = params.imageBase64.replace(/^data:image\/[a-z]+;base64,/, "");

      const prompt = `You are a task validation assistant. Analyze the uploaded image and determine if it provides evidence that the user has completed the following task:

TASK: "${params.taskTitle}"
${params.taskDescription ? `DESCRIPTION: "${params.taskDescription}"` : ""}

RESPOND IN THIS EXACT JSON FORMAT:
{
  "validated": true/false,
  "response": "Brief explanation of your decision",
  "confidence": 0.8,
  "reasoning": "Detailed analysis of what you see in the image and how it relates to the task"
}

VALIDATION CRITERIA:
- Consider if the image shows activity, results, or evidence related to the task
- Look for contextual clues that indicate the task was completed
- Be somewhat lenient - the goal is to encourage task completion, not be overly strict
- If the image is unclear, unrelated, or doesn't show task evidence, mark as not validated
- Confidence should be between 0.1 and 1.0 based on how certain you are

EXAMPLES:
- Task "Go for a 30-minute run": Photo of person running, running shoes, fitness tracker would validate
- Task "Read a book": Photo of open book, reading nook, or person reading would validate  
- Task "Clean kitchen": Photo of clean countertops, organized dishes would validate
- Task "Meditate": Photo of meditation space, person meditating, or calm environment would validate

IMPORTANT: Respond ONLY with the JSON object, no other text.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini", // Use vision-capable model for cost efficiency
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: prompt,
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`,
                },
              },
            ],
          },
        ],
        max_tokens: 500,
        temperature: 0.3,
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error("No response from OpenAI");
      }

      // Parse the JSON response
      const result = JSON.parse(content);
      
      return {
        validated: Boolean(result.validated),
        response: result.response || "Unable to validate task completion",
        confidence: Math.min(Math.max(Number(result.confidence) || 0.5, 0.1), 1.0),
        reasoning: result.reasoning || "No detailed reasoning provided",
      };
    } catch (error) {
      console.error("Photo validation error:", error);
      
      // Return a failure result instead of throwing to allow the flow to continue
      return {
        validated: false,
        response: "Failed to validate photo due to a technical error. Please try again.",
        confidence: 0,
        reasoning: error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  static isConfigured(): boolean {
    return Boolean(process.env.OPENAI_API_KEY);
  }
}