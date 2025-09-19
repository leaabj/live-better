import OpenAI from "openai";
import { z } from "zod";

const GeneratedTask = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  timeSlot: z.enum(["morning", "afternoon", "night"]).optional(),
});

const GeneratedTasks = z.object({
  tasks: z.array(GeneratedTask).min(1).max(10),
  reasoning: z.string().max(1000),
});

export type GeneratedTaskType = z.infer<typeof GeneratedTask>;
export type GeneratedTasksType = z.infer<typeof GeneratedTasks>;

export class AIService {
  static createFallbackResponse(goalTitle: string): GeneratedTasksType {
    // Create more relevant fallback tasks based on common goal patterns
    const goalLower = goalTitle.toLowerCase();

    let fallbackTasks: GeneratedTaskType[] = [
      {
        title: "Review daily progress",
        description: "Spend 5 minutes reviewing your progress toward your goal",
        timeSlot: "night",
      },
    ];

    // goal-specific fallback tasks
    if (
      goalLower.includes("fitness") ||
      goalLower.includes("exercise") ||
      goalLower.includes("workout")
    ) {
      fallbackTasks.unshift({
        title: "Morning workout routine",
        description: "Spend 30 minutes on physical exercise",
        timeSlot: "morning",
      });
    } else if (goalLower.includes("sleep") || goalLower.includes("rest")) {
      fallbackTasks.unshift({
        title: "Evening wind-down routine",
        description: "Start preparing for sleep 1 hour before bedtime",
        timeSlot: "night",
      });
    } else if (goalLower.includes("study") || goalLower.includes("learn")) {
      fallbackTasks.unshift({
        title: "Dedicated study time",
        description: "Spend 45 minutes focused on learning activities",
        timeSlot: "afternoon",
      });
    } else {
      // generic goal tasks
      fallbackTasks.unshift({
        title: "Morning goal planning",
        description: "Spend 10 minutes planning specific actions for today",
        timeSlot: "morning",
      });
    }

    return {
      tasks: fallbackTasks,
      reasoning: `Created ${fallbackTasks.length} daily routine tasks to help achieve: ${goalTitle}`,
    };
  }
  static async generateTasksFromGoal(params: {
    goalTitle: string;
    goalDescription?: string;
    targetDate?: Date;
    userContext?: string;
  }): Promise<GeneratedTasksType> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.warn("OpenAI API key not found, using fallback response");
      return this.createFallbackResponse(params.goalTitle);
    }

    const openai = new OpenAI({
      apiKey: apiKey,
    });

    const { goalTitle, goalDescription, targetDate, userContext } = params;

    const systemPrompt = `You are a helpful daily routine assistant. Your role is to create specific, concrete daily routine tasks.

    IMPORTANT: You must respond with valid JSON in this exact format:
    {
      "tasks": [
        {
          "title": "task name",
          "description": "optional description",
          "timeSlot": "morning|afternoon|night"
        }
      ],
      "reasoning": "brief explanation of why these tasks help achieve the goal"
    }

    Requirements:
    - Generate 3-8 specific daily routine tasks
    - Each task should be actionable and time-specific
    - Include specific times like: 6am, 7am, 8pm, 9pm, 10pm, 11pm, etc.
    - Make tasks relevant to the user's goal`;

    const userPrompt = `Create daily routine tasks for this goal: "${goalTitle}"
    ${goalDescription ? `Goal description: ${goalDescription}` : ""}
    ${targetDate ? `Target date: ${targetDate.toISOString().split("T")[0]}` : ""}
    ${userContext ? `Additional context: ${userContext}` : ""}

    Please provide 3-8 specific daily routine tasks that will help achieve this goal.
    Each task should include specific times and be actionable.

    Respond with valid JSON only.`;
    let response;
    try {
      // Use standard OpenAI API instead of structured output to avoid schema format issues
      response = await openai.chat.completions.create({
        model: "gpt-4o-2024-08-06",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error("No response content from OpenAI");
      }

      let parsedResponse: GeneratedTasksType;
      try {
        parsedResponse = JSON.parse(content);
      } catch (parseError) {
        console.warn(
          "Failed to parse OpenAI response as JSON, trying to extract JSON",
        );

        const jsonPatterns = [
          /\{[\s\S]*\}/, // Standard JSON object
          /\[[\s\S]*\]/, // JSON array
          /```json\s*([\s\S]*?)\s*```/, // JSON in code blocks
          /```\s*([\s\S]*?)\s*```/, // Any code block that might contain JSON
        ];

        let extractedJson = null;
        for (const pattern of jsonPatterns) {
          const match = content.match(pattern);
          if (match) {
            try {
              const jsonStr = match[1] || match[0];
              extractedJson = JSON.parse(jsonStr);
              break;
            } catch (e) {
              continue;
            }
          }
        }

        if (extractedJson) {
          parsedResponse = extractedJson;
        } else {
          console.warn(
            "No valid JSON found in response, creating fallback response",
          );
          parsedResponse = this.createFallbackResponse(goalTitle);
        }
      }

      // validate the response
      const validatedResponse = GeneratedTasks.parse(parsedResponse);
      return validatedResponse;
    } catch (error) {
      console.error("AI Task Generation Error:", error);
      console.error("Goal Title:", goalTitle);
      console.error(
        "OpenAI Response Content:",
        response?.choices[0]?.message?.content,
      );
      throw new Error("Failed to generate tasks from goal");
    }
  }
}
