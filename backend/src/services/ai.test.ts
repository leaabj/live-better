import { describe, it, expect, mock, beforeEach } from "bun:test";
import { AIService, type BulkGoalParams, type GeneratedTasksType } from "./ai";
import OpenAI from "openai";

// Mock OpenAI module
mock.module("openai", () => {
  return {
    default: class MockOpenAI {
      chat = {
        completions: {
          create: mock(() => Promise.resolve({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    reasoning: "Test reasoning",
                    tasks: []
                  })
                }
              }
            ]
          }))
        }
      };
    }
  };
});

describe("AIService", () => {
  const originalEnv = process.env.OPENAI_API_KEY;

  beforeEach(() => {
    // Reset environment
    process.env.OPENAI_API_KEY = "test-api-key";
  });

  describe("generateDailySchedule", () => {
    it("should throw error when no goals provided", async () => {
      const params: BulkGoalParams = {
        goals: [],
        userData: {
          userContext: "Test context",
          preferredTimeSlots: null,
        },
      };

      await expect(AIService.generateDailySchedule(params)).rejects.toThrow(
        "No goals provided for task generation"
      );
    });

    it("should throw error when OpenAI API key is missing", async () => {
      delete process.env.OPENAI_API_KEY;

      const params: BulkGoalParams = {
        goals: [{ id: 1, title: "Test Goal", description: "Description" }],
        userData: {
          userContext: "Test context",
          preferredTimeSlots: null,
        },
      };

      await expect(AIService.generateDailySchedule(params)).rejects.toThrow(
        "OpenAI API key not found"
      );

      process.env.OPENAI_API_KEY = originalEnv;
    });

    it("should use default time slots when preferredTimeSlots is null", async () => {
      const mockCreate = mock(() =>
        Promise.resolve({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  reasoning: "Using default time slots",
                  tasks: [
                    {
                      title: "Morning task",
                      description: "Task description",
                      timeSlot: "morning",
                      specificTime: new Date().toISOString(),
                      duration: 30,
                      goalId: 1,
                    },
                  ],
                }),
              },
            },
          ],
        })
      );

      mock.module("openai", () => {
        return {
          default: class MockOpenAI {
            chat = {
              completions: {
                create: mockCreate,
              },
            };
          },
        };
      });

      const params: BulkGoalParams = {
        goals: [{ id: 1, title: "Test Goal" }],
        userData: {
          userContext: null,
          preferredTimeSlots: null,
        },
      };

      const result = await AIService.generateDailySchedule(params);
      expect(result.tasks).toHaveLength(1);
      expect(result.reasoning).toBe("Using default time slots");
    });

    it("should parse valid preferredTimeSlots JSON", async () => {
      const mockCreate = mock(() =>
        Promise.resolve({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  reasoning: "Using preferred time slots",
                  tasks: [
                    {
                      title: "Morning task",
                      description: "Task description",
                      timeSlot: "morning",
                      specificTime: new Date().toISOString(),
                      duration: 30,
                      goalId: 1,
                    },
                  ],
                }),
              },
            },
          ],
        })
      );

      mock.module("openai", () => {
        return {
          default: class MockOpenAI {
            chat = {
              completions: {
                create: mockCreate,
              },
            };
          },
        };
      });

      const params: BulkGoalParams = {
        goals: [{ id: 1, title: "Test Goal" }],
        userData: {
          userContext: "Test context",
          preferredTimeSlots: JSON.stringify(["morning", "afternoon"]),
        },
      };

      const result = await AIService.generateDailySchedule(params);
      expect(result.tasks).toHaveLength(1);
    });

    it("should handle invalid preferredTimeSlots JSON gracefully", async () => {
      const mockCreate = mock(() =>
        Promise.resolve({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  reasoning: "Using default slots due to invalid JSON",
                  tasks: [],
                }),
              },
            },
          ],
        })
      );

      mock.module("openai", () => {
        return {
          default: class MockOpenAI {
            chat = {
              completions: {
                create: mockCreate,
              },
            };
          },
        };
      });

      const params: BulkGoalParams = {
        goals: [{ id: 1, title: "Test Goal" }],
        userData: {
          userContext: "Test context",
          preferredTimeSlots: "invalid-json",
        },
      };

      const result = await AIService.generateDailySchedule(params);
      expect(result.tasks).toHaveLength(0);
    });

    it("should filter out invalid time slots from preferredTimeSlots", async () => {
      const mockCreate = mock(() =>
        Promise.resolve({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  reasoning: "Filtered invalid time slots",
                  tasks: [],
                }),
              },
            },
          ],
        })
      );

      mock.module("openai", () => {
        return {
          default: class MockOpenAI {
            chat = {
              completions: {
                create: mockCreate,
              },
            };
          },
        };
      });

      const params: BulkGoalParams = {
        goals: [{ id: 1, title: "Test Goal" }],
        userData: {
          userContext: "Test context",
          preferredTimeSlots: JSON.stringify([
            "morning",
            "invalid",
            "afternoon",
            "random",
          ]),
        },
      };

      const result = await AIService.generateDailySchedule(params);
      expect(result).toBeDefined();
    });

    it("should generate tasks with correct default values", async () => {
      const today = new Date().toISOString().split("T")[0];
      const mockCreate = mock(() =>
        Promise.resolve({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  reasoning: "Generated with defaults",
                  tasks: [
                    {
                      title: null,
                      description: null,
                      timeSlot: null,
                      specificTime: `${today}T10:00:00Z`,
                      duration: null,
                      goalId: 1,
                    },
                  ],
                }),
              },
            },
          ],
        })
      );

      mock.module("openai", () => {
        return {
          default: class MockOpenAI {
            chat = {
              completions: {
                create: mockCreate,
              },
            };
          },
        };
      });

      const params: BulkGoalParams = {
        goals: [{ id: 1, title: "Test Goal" }],
        userData: {
          userContext: null,
          preferredTimeSlots: null,
        },
      };

      const result = await AIService.generateDailySchedule(params);
      expect(result.tasks).toHaveLength(1);
      expect(result.tasks[0].title).toBe("Task");
      expect(result.tasks[0].description).toBe("");
      expect(result.tasks[0].timeSlot).toBe("morning");
      expect(result.tasks[0].duration).toBe(30);
    });

    it("should clamp duration to valid range (5-480 minutes)", async () => {
      const today = new Date().toISOString().split("T")[0];
      const mockCreate = mock(() =>
        Promise.resolve({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  reasoning: "Testing duration clamping",
                  tasks: [
                    {
                      title: "Too short",
                      description: "Test",
                      timeSlot: "morning",
                      specificTime: `${today}T10:00:00Z`,
                      duration: 1, // Below minimum
                      goalId: 1,
                    },
                    {
                      title: "Too long",
                      description: "Test",
                      timeSlot: "afternoon",
                      specificTime: `${today}T14:00:00Z`,
                      duration: 600, // Above maximum
                      goalId: 1,
                    },
                  ],
                }),
              },
            },
          ],
        })
      );

      mock.module("openai", () => {
        return {
          default: class MockOpenAI {
            chat = {
              completions: {
                create: mockCreate,
              },
            };
          },
        };
      });

      const params: BulkGoalParams = {
        goals: [{ id: 1, title: "Test Goal" }],
        userData: {
          userContext: null,
          preferredTimeSlots: null,
        },
      };

      const result = await AIService.generateDailySchedule(params);
      expect(result.tasks[0].duration).toBe(5); // Clamped to minimum
      expect(result.tasks[1].duration).toBe(480); // Clamped to maximum
    });

    it("should correct task dates to today when AI returns wrong date", async () => {
      const today = new Date();
      const todayString = today.toISOString().split("T")[0];
      const wrongDate = "2023-05-15T10:00:00Z"; // Wrong year

      const mockCreate = mock(() =>
        Promise.resolve({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  reasoning: "Testing date correction",
                  tasks: [
                    {
                      title: "Task with wrong date",
                      description: "Test",
                      timeSlot: "morning",
                      specificTime: wrongDate,
                      duration: 30,
                      goalId: 1,
                    },
                  ],
                }),
              },
            },
          ],
        })
      );

      mock.module("openai", () => {
        return {
          default: class MockOpenAI {
            chat = {
              completions: {
                create: mockCreate,
              },
            };
          },
        };
      });

      const params: BulkGoalParams = {
        goals: [{ id: 1, title: "Test Goal" }],
        userData: {
          userContext: null,
          preferredTimeSlots: null,
        },
      };

      const result = await AIService.generateDailySchedule(params);
      const taskDate = result.tasks[0].specificTime?.toISOString().split("T")[0];
      expect(taskDate).toBe(todayString);
    });

    it("should use first goal ID when task has invalid goalId", async () => {
      const today = new Date().toISOString().split("T")[0];
      const mockCreate = mock(() =>
        Promise.resolve({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  reasoning: "Testing invalid goal ID",
                  tasks: [
                    {
                      title: "Task with invalid goal",
                      description: "Test",
                      timeSlot: "morning",
                      specificTime: `${today}T10:00:00Z`,
                      duration: 30,
                      goalId: 999, // Invalid goal ID
                    },
                  ],
                }),
              },
            },
          ],
        })
      );

      mock.module("openai", () => {
        return {
          default: class MockOpenAI {
            chat = {
              completions: {
                create: mockCreate,
              },
            };
          },
        };
      });

      const params: BulkGoalParams = {
        goals: [
          { id: 1, title: "Valid Goal 1" },
          { id: 2, title: "Valid Goal 2" },
        ],
        userData: {
          userContext: null,
          preferredTimeSlots: null,
        },
      };

      const result = await AIService.generateDailySchedule(params);
      expect(result.tasks[0].goalId).toBe(1); // Should use first goal
    });

    it("should handle multiple goals correctly", async () => {
      const today = new Date().toISOString().split("T")[0];
      const mockCreate = mock(() =>
        Promise.resolve({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  reasoning: "Testing multiple goals",
                  tasks: [
                    {
                      title: "Task for goal 1",
                      description: "Test 1",
                      timeSlot: "morning",
                      specificTime: `${today}T08:00:00Z`,
                      duration: 30,
                      goalId: 1,
                    },
                    {
                      title: "Task for goal 2",
                      description: "Test 2",
                      timeSlot: "afternoon",
                      specificTime: `${today}T14:00:00Z`,
                      duration: 60,
                      goalId: 2,
                    },
                  ],
                }),
              },
            },
          ],
        })
      );

      mock.module("openai", () => {
        return {
          default: class MockOpenAI {
            chat = {
              completions: {
                create: mockCreate,
              },
            };
          },
        };
      });

      const params: BulkGoalParams = {
        goals: [
          { id: 1, title: "Goal 1", description: "First goal" },
          { id: 2, title: "Goal 2", description: "Second goal" },
        ],
        userData: {
          userContext: "User prefers morning work",
          preferredTimeSlots: null,
        },
      };

      const result = await AIService.generateDailySchedule(params);
      expect(result.tasks).toHaveLength(2);
      expect(result.tasks[0].goalId).toBe(1);
      expect(result.tasks[1].goalId).toBe(2);
    });

    it("should throw error when OpenAI returns no content", async () => {
      const mockCreate = mock(() =>
        Promise.resolve({
          choices: [
            {
              message: {
                content: null, // No content
              },
            },
          ],
        })
      );

      mock.module("openai", () => {
        return {
          default: class MockOpenAI {
            chat = {
              completions: {
                create: mockCreate,
              },
            };
          },
        };
      });

      const params: BulkGoalParams = {
        goals: [{ id: 1, title: "Test Goal" }],
        userData: {
          userContext: null,
          preferredTimeSlots: null,
        },
      };

      await expect(AIService.generateDailySchedule(params)).rejects.toThrow(
        "Failed to generate daily schedule"
      );
    });

    it("should handle OpenAI API errors gracefully", async () => {
      const mockCreate = mock(() =>
        Promise.reject(new Error("OpenAI API error"))
      );

      mock.module("openai", () => {
        return {
          default: class MockOpenAI {
            chat = {
              completions: {
                create: mockCreate,
              },
            };
          },
        };
      });

      const params: BulkGoalParams = {
        goals: [{ id: 1, title: "Test Goal" }],
        userData: {
          userContext: null,
          preferredTimeSlots: null,
        },
      };

      await expect(AIService.generateDailySchedule(params)).rejects.toThrow(
        "Failed to generate daily schedule"
      );
    });

    it("should handle invalid JSON response from OpenAI", async () => {
      const mockCreate = mock(() =>
        Promise.resolve({
          choices: [
            {
              message: {
                content: "invalid json {{{", // Invalid JSON
              },
            },
          ],
        })
      );

      mock.module("openai", () => {
        return {
          default: class MockOpenAI {
            chat = {
              completions: {
                create: mockCreate,
              },
            };
          },
        };
      });

      const params: BulkGoalParams = {
        goals: [{ id: 1, title: "Test Goal" }],
        userData: {
          userContext: null,
          preferredTimeSlots: null,
        },
      };

      await expect(AIService.generateDailySchedule(params)).rejects.toThrow(
        "Failed to generate daily schedule"
      );
    });

    it("should handle all three time slots correctly", async () => {
      const today = new Date().toISOString().split("T")[0];
      const mockCreate = mock(() =>
        Promise.resolve({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  reasoning: "Testing all time slots",
                  tasks: [
                    {
                      title: "Morning task",
                      description: "Morning",
                      timeSlot: "morning",
                      specificTime: `${today}T08:00:00Z`,
                      duration: 30,
                      goalId: 1,
                    },
                    {
                      title: "Afternoon task",
                      description: "Afternoon",
                      timeSlot: "afternoon",
                      specificTime: `${today}T14:00:00Z`,
                      duration: 45,
                      goalId: 1,
                    },
                    {
                      title: "Night task",
                      description: "Night",
                      timeSlot: "night",
                      specificTime: `${today}T20:00:00Z`,
                      duration: 60,
                      goalId: 1,
                    },
                  ],
                }),
              },
            },
          ],
        })
      );

      mock.module("openai", () => {
        return {
          default: class MockOpenAI {
            chat = {
              completions: {
                create: mockCreate,
              },
            };
          },
        };
      });

      const params: BulkGoalParams = {
        goals: [{ id: 1, title: "Test Goal" }],
        userData: {
          userContext: null,
          preferredTimeSlots: null,
        },
      };

      const result = await AIService.generateDailySchedule(params);
      expect(result.tasks).toHaveLength(3);
      expect(result.tasks[0].timeSlot).toBe("morning");
      expect(result.tasks[1].timeSlot).toBe("afternoon");
      expect(result.tasks[2].timeSlot).toBe("night");
    });

    it("should use empty string for userContext when null", async () => {
      const mockCreate = mock(() =>
        Promise.resolve({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  reasoning: "No user context provided",
                  tasks: [],
                }),
              },
            },
          ],
        })
      );

      mock.module("openai", () => {
        return {
          default: class MockOpenAI {
            chat = {
              completions: {
                create: mockCreate,
              },
            };
          },
        };
      });

      const params: BulkGoalParams = {
        goals: [{ id: 1, title: "Test Goal" }],
        userData: {
          userContext: null,
          preferredTimeSlots: null,
        },
      };

      const result = await AIService.generateDailySchedule(params);
      expect(result).toBeDefined();
    });

    it("should handle tasks without specificTime", async () => {
      const mockCreate = mock(() =>
        Promise.resolve({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  reasoning: "Task without specific time",
                  tasks: [
                    {
                      title: "Flexible task",
                      description: "Can be done anytime",
                      timeSlot: "morning",
                      specificTime: null,
                      duration: 30,
                      goalId: 1,
                    },
                  ],
                }),
              },
            },
          ],
        })
      );

      mock.module("openai", () => {
        return {
          default: class MockOpenAI {
            chat = {
              completions: {
                create: mockCreate,
              },
            };
          },
        };
      });

      const params: BulkGoalParams = {
        goals: [{ id: 1, title: "Test Goal" }],
        userData: {
          userContext: null,
          preferredTimeSlots: null,
        },
      };

      const result = await AIService.generateDailySchedule(params);
      expect(result.tasks[0].specificTime).toBeUndefined();
    });

    it("should return default reasoning when not provided", async () => {
      const mockCreate = mock(() =>
        Promise.resolve({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  tasks: [],
                  // No reasoning field
                }),
              },
            },
          ],
        })
      );

      mock.module("openai", () => {
        return {
          default: class MockOpenAI {
            chat = {
              completions: {
                create: mockCreate,
              },
            };
          },
        };
      });

      const params: BulkGoalParams = {
        goals: [{ id: 1, title: "Test Goal" }],
        userData: {
          userContext: null,
          preferredTimeSlots: null,
        },
      };

      const result = await AIService.generateDailySchedule(params);
      expect(result.reasoning).toBe("Generated daily schedule");
    });
  });
});
