import { GoogleGenAI, Type } from "@google/genai";
import { AgentType, Profession } from '../types';

if (!process.env.API_KEY) {
    console.warn("API_KEY environment variable not set. Using a placeholder. Please set your API key for the app to function.");
    process.env.API_KEY = "YOUR_API_KEY";
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const AGENT_PROMPTS = {
    [AgentType.INTERVIEWER]: (profession: Profession, level: number) => `You are an Interviewer Agent in a career simulation game called 'CareerRoguelike'. 
      Your task is to generate a single, realistic interview question for a Level ${level} ${profession.name}.
      - For engineers, create a whiteboard coding problem (provide a clear function signature and expected output).
      - For data analysts, create a SQL case study or a data interpretation problem.
      - For product designers, create a portfolio critique task or a small UI/UX challenge.
      - For sales, create a discovery call roleplay scenario or an objection handling challenge.
      The question should be challenging but appropriate for the level. Be concise.
      Return ONLY the question text. Do not add any conversational fluff.`,
    
    [AgentType.AUTO_GRADER]: (profession: Profession, level: number, taskDescription: string, userAnswer: string) => `You are an Auto-Grader Agent in a career simulation game.
      A Level ${level} ${profession.name} was given the following task: "${taskDescription}".
      They submitted this answer: "${userAnswer}".
      Your job is to:
      1. Score the answer on a scale of 1 to 10.
      2. Provide brief, constructive feedback (2-3 sentences).
      3. Provide a concise "model" answer for comparison.
      Return your response as a JSON object with the keys "score", "feedback", and "modelAnswer". The score must be an integer.
      Example JSON: {"score": 8, "feedback": "Good approach, but you missed an edge case.", "modelAnswer": "A better solution would handle null inputs..."}`,
      
    [AgentType.COMPANY_SIMULATOR]: (profession: Profession, level: number) => `You are a Company Simulator Agent in a career simulation game.
      Generate a brief (1-2 sentence) update for a Level ${level} ${profession.name} starting a new week. 
      Mention a high-level goal, a potential blocker, or a team dynamic. Make it feel like a real workplace update.
      Example: "This week, the team is focused on shipping the new feature. Watch out for potential delays from the API team."`,
      
    [AgentType.EVENT_GENERATOR]: (profession: Profession, level: number) => `You are an Event Generator Agent in a career simulation game.
      Generate a profession-specific surprise event for a Level ${level} ${profession.name}. The event should present a challenge or a dilemma.
      Return a JSON object with two keys:
      - "description": A string (2-3 sentences) explaining the event.
      - "choices": An array of 2-3 short strings representing the player's options.
      Example: {"description": "A critical production bug was just reported...", "choices": ["Work late to fix it now", "Delegate to the on-call team", "Wait until tomorrow"]}`,

    [AgentType.EVENT_RESOLVER]: (eventDescription: string, playerChoice: string) => `You are a narrative agent in a career simulation game. The player was faced with an event: "${eventDescription}".
      They chose to: "${playerChoice}".
      Generate a brief, one-sentence narrative consequence of their action. Be creative and reflect a realistic workplace outcome.
      Return ONLY the consequence text.`,
};

interface GraderResult {
    score: number;
    feedback: string;
    modelAnswer: string;
}

interface EventResult {
    description: string;
    choices: string[];
}


export async function generateWithAgent(agentType: AgentType.INTERVIEWER, context: { profession: Profession, level: number }): Promise<string>;
export async function generateWithAgent(agentType: AgentType.COMPANY_SIMULATOR, context: { profession: Profession, level: number }): Promise<string>;
export async function generateWithAgent(agentType: AgentType.EVENT_RESOLVER, context: { eventDescription: string, playerChoice: string }): Promise<string>;
export async function generateWithAgent(agentType: AgentType.AUTO_GRADER, context: { profession: Profession, level: number, taskDescription: string, userAnswer: string }): Promise<GraderResult>;
export async function generateWithAgent(agentType: AgentType.EVENT_GENERATOR, context: { profession: Profession, level: number }): Promise<EventResult>;
export async function generateWithAgent(agentType: AgentType, context: any): Promise<string | GraderResult | EventResult> {
    let prompt = "";
    let modelName = 'gemini-2.5-flash';
    let config: any = {};
    let isJson = false;
    
    switch (agentType) {
        case AgentType.INTERVIEWER:
            modelName = 'gemini-2.5-pro'; // Complex task
            config = { thinkingConfig: { thinkingBudget: 32768 } };
            prompt = AGENT_PROMPTS[AgentType.INTERVIEWER](context.profession, context.level);
            break;
        case AgentType.AUTO_GRADER:
            modelName = 'gemini-2.5-pro'; // Complex evaluation
            config = { 
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        score: { type: Type.INTEGER },
                        feedback: { type: Type.STRING },
                        modelAnswer: { type: Type.STRING }
                    },
                    required: ['score', 'feedback', 'modelAnswer']
                },
                thinkingConfig: { thinkingBudget: 32768 } 
            };
            prompt = AGENT_PROMPTS[AgentType.AUTO_GRADER](context.profession, context.level, context.taskDescription, context.userAnswer);
            isJson = true;
            break;
        case AgentType.COMPANY_SIMULATOR:
            modelName = 'gemini-flash-lite-latest'; // Low-latency response
            prompt = AGENT_PROMPTS[AgentType.COMPANY_SIMULATOR](context.profession, context.level);
            break;
        case AgentType.EVENT_GENERATOR:
             modelName = 'gemini-2.5-flash';
             config = {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        description: { type: Type.STRING },
                        choices: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING }
                        }
                    },
                    required: ['description', 'choices']
                }
            };
            prompt = AGENT_PROMPTS[AgentType.EVENT_GENERATOR](context.profession, context.level);
            isJson = true;
            break;
        case AgentType.EVENT_RESOLVER:
            modelName = 'gemini-flash-lite-latest';
            prompt = AGENT_PROMPTS[AgentType.EVENT_RESOLVER](context.eventDescription, context.playerChoice);
            break;
        default:
            throw new Error(`Unknown agent type: ${agentType}`);
    }

    try {
        const response = await ai.models.generateContent({
            model: modelName,
            contents: prompt,
            config,
        });

        const text = response.text;
        
        if (isJson) {
            // The API with responseSchema should return valid JSON, but we clean just in case.
            const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(cleanedText);
        }
        return text;

    } catch (error) {
        console.error(`Error with Gemini API call for ${agentType}:`, error);
        if (agentType === AgentType.AUTO_GRADER) {
            return { score: 5, feedback: "AI grader failed. Default score awarded.", modelAnswer: "N/A"};
        }
        if (agentType === AgentType.EVENT_GENERATOR) {
            return { description: "A critical server went down.", choices: ["Restart it", "Check the logs", "Ask for help"] };
        }
        return `An error occurred while generating content for ${agentType}.`;
    }
}