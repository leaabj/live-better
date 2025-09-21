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

export interface BulkGoalParams {
  goals: Array<{
    id: number;
    title: string;
    description?: string;
    targetDate?: Date;
  }>;
  userContext?: string;
  dailyTimeBudget?: number;
  preferences?: {
    preferredTimeSlots: ('morning' | 'afternoon' | 'night')[];
  };
}

export interface BulkGeneratedTasksType {
  tasks: Array<{
    title: string;
    description?: string;
    timeSlot?: 'morning' | 'afternoon' | 'night';
    goalId: number;
    estimatedMinutes?: number;
  }>;
  reasoning: string;
  dailySchedule?: Array<{
    time: string;
    task: string;
    duration: number;
  }>;
}

export class AIService {
  static createFallbackResponse(goalTitle: string): GeneratedTasksType {
    // Relevant fallback tasks based on common goal patterns
    const goalLower = goalTitle.toLowerCase();

    let fallbackTasks: GeneratedTaskType[] = [
      {
        title: "Review daily progress",
        description: "Spend 5 minutes reviewing your progress toward your goal",
        timeSlot: "night",
      },
    ];

    // goal specific fallback tasks
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

    Generate 3-8 specific daily routine tasks that are actionable and time-specific.
    Include specific times like: 6am, 7am, 8pm, 9pm, 10pm, 11pm, etc.
    Make tasks relevant to the user's goal.`;

    const userPrompt = `Create daily routine tasks for this goal: "${goalTitle}"
    ${goalDescription ? `Goal description: ${goalDescription}` : ""}
    ${targetDate ? `Target date: ${targetDate.toISOString().split("T")[0]}` : ""}
    ${userContext ? `Additional context: ${userContext}` : ""}

    Please provide 3-8 specific daily routine tasks that will help achieve this goal.
    Each task should include specific times and be actionable.

    Respond with valid JSON only.`;
    let response;
    try {
      // Structured output OpenAI
      response = await openai.chat.completions.create({
        model: "gpt-4o-2024-08-06",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 1000,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "generated_tasks",
            schema: {
              type: "object",
              properties: {
                tasks: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: {
                        type: "string",
                        minLength: 1,
                        maxLength: 200,
                      },
                      description: {
                        type: "string",
                        maxLength: 500,
                      },
                      timeSlot: {
                        type: "string",
                        enum: ["morning", "afternoon", "night"],
                      },
                    },
                    required: ["title"],
                    additionalProperties: false,
                  },
                  minItems: 1,
                  maxItems: 10,
                },
                reasoning: {
                  type: "string",
                  minLength: 1,
                  maxLength: 1000,
                },
              },
              required: ["tasks", "reasoning"],
              additionalProperties: false,
            },
          },
        },
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error("No response content from OpenAI");
      }

      // parse JSON  (should be valid because structured output)
      const parsedResponse: GeneratedTasksType = JSON.parse(content);

      // zod (extra safety)
      const validatedResponse = GeneratedTasks.parse(parsedResponse);
      return validatedResponse;
    } catch (error) {
      console.error("AI Task Generation Error:", error);
      console.error("Goal Title:", goalTitle);
      if (response?.choices[0]?.message?.content) {
        console.error(
          "OpenAI Response Content:",
          response.choices[0].message.content,
        );
      }
      throw new Error("Failed to generate tasks from goal");
    }
  }

  static async generateTasksFromAllGoals(params: BulkGoalParams): Promise<BulkGeneratedTasksType> {
    const { goals, userContext, dailyTimeBudget = 8, preferences } = params;

    if (goals.length === 0) {
      throw new Error("No goals provided for task generation");
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.warn("OpenAI API key not found, using fallback response for multiple goals");
      return this.createBulkFallbackResponse(goals);
    }

    const openai = new OpenAI({
      apiKey: apiKey,
    });

    const systemPrompt = `You are an expert daily routine optimizer. Create a cohesive daily schedule that addresses ALL of these user goals simultaneously:

GOALS:
${goals.map((g, i) => `${i + 1}. ${g.title}: ${g.description || 'No description'}`).join('\n')}

CONSTRAINTS:
- Total daily time available: ${dailyTimeBudget} hours
- Preferred time slots: ${preferences?.preferredTimeSlots?.join(', ') || 'morning, afternoon, night'}
- User context: ${userContext || 'Not provided'}

REQUIREMENTS:
1. Create complementary tasks that serve multiple goals when possible
2. Balance activities throughout the day
3. Ensure realistic time allocations
4. Provide specific times (6am, 7am, 8pm, etc.)
5. Assign each task to the most relevant goal

Create a cohesive daily routine addressing all goals.`;

    const userPrompt = `Please create a comprehensive daily routine that helps me achieve all my goals while fitting within my time constraints.

Additional context: ${userContext || 'No additional context'}

Return valid JSON with tasks and a brief explanation of how this schedule balances my goals.`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-2024-08-06",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 2000,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "bulk_generated_tasks",
            schema: {
              type: "object",
              properties: {
                tasks: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string", minLength: 1, maxLength: 200 },
                      description: { type: "string", maxLength: 500 },
                      timeSlot: { type: "string", enum: ["morning", "afternoon", "night"] },
                      goalId: { type: "number" },
                      estimatedMinutes: { type: "number", minimum: 5, maximum: 240 },
                    },
                    required: ["title", "goalId"],
                    additionalProperties: false,
                  },
                  minItems: 1,
                  maxItems: 15,
                },
                reasoning: { type: "string", minLength: 1, maxLength: 1500 },
                dailySchedule: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      time: { type: "string" },
                      task: { type: "string" },
                      duration: { type: "number" },
                    },
                  },
                },
              },
              required: ["tasks", "reasoning"],
              additionalProperties: false,
            },
          },
        },
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error("No response content from OpenAI");
      }

      const parsedResponse: BulkGeneratedTasksType = JSON.parse(content);
      
      // Validate with Zod for extra safety
      const taskSchema = z.object({
        title: z.string().min(1).max(200),
        description: z.string().max(500).optional(),
        timeSlot: z.enum(["morning", "afternoon", "night"]).optional(),
        goalId: z.number(),
        estimatedMinutes: z.number().min(5).max(240).optional(),
      });

      const bulkSchema = z.object({
        tasks: z.array(taskSchema).min(1).max(15),
        reasoning: z.string().min(1).max(1500),
        dailySchedule: z.array(z.object({
          time: z.string(),
          task: z.string(),
          duration: z.number(),
        })).optional(),
      });

      return bulkSchema.parse(parsedResponse);
    } catch (error) {
      console.error("Bulk AI Task Generation Error:", error);
      console.error("Goals Count:", goals.length);
      throw new Error("Failed to generate tasks from multiple goals");
    }
  }

  static createBulkFallbackResponse(goals: BulkGoalParams['goals']): BulkGeneratedTasksType {
    const goalCategories = this.categorizeGoals(goals);
    const tasks: BulkGeneratedTasksType['tasks'] = [];

    // Morning routine (serves multiple goals)
    if (goalCategories.fitness.length > 0) {
      tasks.push({
        title: "Morning fitness routine",
        description: "30 minutes serving fitness goals",
        timeSlot: "morning",
        goalId: goalCategories.fitness[0].id,
        estimatedMinutes: 30,
      });
    }

    // Learning block
    if (goalCategories.learning.length > 0) {
      tasks.push({
        title: "Dedicated learning time",
        description: "45 minutes focused on learning goals",
        timeSlot: "afternoon",
        goalId: goalCategories.learning[0].id,
        estimatedMinutes: 45,
      });
    }

    // Evening wind-down
    if (goalCategories.wellness.length > 0) {
      tasks.push({
        title: "Evening wellness routine",
        description: "Wind-down activities for wellness goals",
        timeSlot: "night",
        goalId: goalCategories.wellness[0].id,
        estimatedMinutes: 20,
      });
    }

    // Generic goals
    if (goalCategories.generic.length > 0) {
      tasks.push({
        title: "Daily goal review",
        description: "Review progress on all goals",
        timeSlot: "night",
        goalId: goalCategories.generic[0].id,
        estimatedMinutes: 10,
      });
    }

    return {
      tasks,
      reasoning: `Created ${tasks.length} daily routine tasks to help achieve ${goals.length} goals: ${goals.map(g => g.title).join(', ')}`,
    };
  }

  static categorizeGoals(goals: BulkGoalParams['goals']) {
    const categories = {
      fitness: [] as typeof goals,
      learning: [] as typeof goals,
      wellness: [] as typeof goals,
      generic: [] as typeof goals,
    };

    goals.forEach(goal => {
      const titleLower = goal.title.toLowerCase();
      if (titleLower.includes("fitness") || titleLower.includes("exercise") || titleLower.includes("workout")) {
        categories.fitness.push(goal);
      } else if (titleLower.includes("study") || titleLower.includes("learn") || titleLower.includes("skill")) {
        categories.learning.push(goal);
      } else if (titleLower.includes("sleep") || titleLower.includes("meditation") || titleLower.includes("wellness")) {
        categories.wellness.push(goal);
      } else {
        categories.generic.push(goal);
      }
    });

    return categories;
  }
}
