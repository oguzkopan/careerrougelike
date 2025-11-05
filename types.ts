
export interface Profession {
  id: string;
  name: string;
  description: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
}

export interface CVEntry {
  id: string;
  role: string;
  company: string;
  duration: string;
  bulletPoints: string[];
}

export interface PlayerProfile {
  name: string;
  profession: Profession;
  level: number;
  score: number;
  cv: CVEntry[];
  skills: string[];
}

export type GameStage = 'selecting_profession' | 'interview' | 'working' | 'event' | 'game_over';

export interface Task {
  id: string;
  type: 'interview' | 'task' | 'event';
  title: string;
  description: string;
  prompt: string;
  choices?: string[];
}

export interface StoryEvent {
  type: 'system' | 'task' | 'feedback' | 'event' | 'promotion' | 'layoff';
  content: string;
  timestamp?: string;
}

export interface GameState {
  stage: GameStage;
  sessionId: string | null;
  playerProfile: PlayerProfile | null;
  currentTask: Task | null;
  storyEvents: StoryEvent[];
  isLoading: boolean;
  error: string | null;
}

export enum AgentType {
  INTERVIEWER = 'INTERVIEWER',
  TASK_GENERATOR = 'TASK_GENERATOR',
  AUTO_GRADER = 'AUTO_GRADER',
  COACH = 'COACH',
  EVENT_GENERATOR = 'EVENT_GENERATOR',
  EVENT_RESOLVER = 'EVENT_RESOLVER',
  CV_AGENT = 'CV_AGENT',
  COMPANY_SIMULATOR = 'COMPANY_SIMULATOR',
  ECONOMY_AGENT = 'ECONOMY_AGENT',
  ORCHESTRATOR = 'ORCHESTRATOR',
  PROFESSION_DESIGNER = 'PROFESSION_DESIGNER',
  SAFETY_AGENT = 'SAFETY_AGENT',
}

export interface AgentConfig {
  id: AgentType;
  name: string;
  description: string;
  model: 'Gemini 2.5 Pro' | 'Gemini 2.5 Flash' | 'Gemini Flash Lite';
  promptSnippet: string;
}