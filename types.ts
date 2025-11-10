
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

export type GameStage = 'selecting_profession' | 'graduated' | 'interview' | 'working' | 'event' | 'game_over';

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

export type JobLevel = 'entry' | 'mid' | 'senior';
export type JobType = 'remote' | 'hybrid' | 'onsite';

export interface JobListing {
  id: string;
  companyName: string;
  companyLogo?: string;
  position: string;
  location: string;
  jobType: JobType;
  salaryRange?: { min: number; max: number };
  level: JobLevel;
  requirements: string[];
  postedDate: string;
  description?: string;
  responsibilities?: string[];
  benefits?: string[];
  qualifications?: string[];
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

export interface InterviewQuestion {
  id: string;
  question: string;
  expectedAnswer?: string;
}

export interface InterviewResult {
  passed: boolean;
  overallScore: number;
  overall_score?: number; // Backend returns snake_case
  feedback: Array<{
    question: string;
    answer: string;
    score: number;
    feedback: string;
  }>;
}

export interface PlayerState {
  sessionId: string;
  profession: string; // Added: profession ID (e.g., 'ios_engineer')
  status: 'graduated' | 'job_searching' | 'interviewing' | 'employed';
  level: number;
  xp: number;
  xpToNextLevel: number;
  currentJob?: {
    jobId: string;
    companyName: string;
    position: string;
    startDate: string;
    salary?: number;
  };
  stats: {
    tasksCompleted: number;
    jobsHeld: number;
    interviewsPassed: number;
    interviewsFailed: number;
    meetingsAttended?: number;
    avgMeetingScore?: number;
  };
  cv_data?: CVData;
  createdAt: string;
  updatedAt: string;
}

export type TaskFormatType = 
  | 'text_answer' 
  | 'multiple_choice' 
  | 'fill_in_blank' 
  | 'code_review' 
  | 'prioritization';

export interface MultipleChoiceOption {
  id: string;
  text: string;
}

export interface FillInBlank {
  id: string;
  text: string;
  placeholder: string;
}



export interface CodeReviewBug {
  lineNumber: number;
  description: string;
}

export interface PrioritizationItem {
  id: string;
  text: string;
  order?: number;
}

export interface ValidationResult {
  is_valid: boolean;
  errors: string[];
  warnings: string[];
  repaired: boolean;
}

export interface WorkTask {
  id: string;
  title: string;
  description: string;
  requirements: string[];
  acceptanceCriteria: string[];
  difficulty: number;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  xpReward: number;
  dueDate?: string;
  createdAt: string;
  imageUrl?: string; // AI-generated task visualization
  formatType?: TaskFormatType;
  validationStatus?: 'valid' | 'invalid' | 'repaired';
  
  // Multiple choice specific fields
  options?: MultipleChoiceOption[];
  correctAnswer?: string;
  explanation?: string;
  
  // Fill in blank specific fields
  blanks?: FillInBlank[];
  blankText?: string; // Text with {blank_id} placeholders
  expectedAnswers?: Record<string, string>;
  

  
  // Code review specific fields
  code?: string;
  bugs?: CodeReviewBug[];
  
  // Prioritization specific fields
  prioritizationItems?: PrioritizationItem[];
  correctPriority?: string[]; // Array of item IDs in correct order
}

export interface JobExperience {
  companyName?: string;
  company_name?: string;
  position: string;
  startDate?: string;
  start_date?: string;
  endDate?: string;
  end_date?: string;
  accomplishments: string[];
}

export interface CVData {
  experience: JobExperience[];
  skills: string[];
  accomplishments: string[];
}

export type MeetingType = 
  | 'team_standup' 
  | 'one_on_one' 
  | 'project_review' 
  | 'stakeholder_presentation' 
  | 'performance_review'
  | 'team_meeting'
  | 'project_update'
  | 'feedback_session';

export type MeetingStatus = 'scheduled' | 'in_progress' | 'completed' | 'left_early';

export type MeetingPriority = 'optional' | 'recommended' | 'required';

export interface MeetingParticipant {
  id: string;
  name: string;
  role: string;
  personality: string;
  avatar_color: string;
}

export interface MeetingTopic {
  id: string;
  question: string;
  context: string;
  expected_points: string[];
  ai_discussion_prompts?: string[];
}

export interface ConversationMessage {
  id: string;
  type: 'topic_intro' | 'ai_response' | 'player_response' | 'system' | 'player_turn';
  participant_id?: string;
  participant_name?: string;
  participant_role?: string;
  content: string;
  timestamp: string;
  sentiment?: 'positive' | 'neutral' | 'constructive' | 'challenging';
  sequence_number?: number;
}

export interface Meeting {
  id: string;
  meeting_type: MeetingType;
  title: string;
  status: MeetingStatus;
  scheduled_time?: string;
  priority: MeetingPriority;
  participants: MeetingParticipant[];
  estimated_duration_minutes: number;
  duration_minutes?: number; // Alias for estimated_duration_minutes
  context: string;
  context_preview?: string;
  topics: MeetingTopic[];
  objective: string;
  current_topic_index?: number;
  responses?: any[];
  conversation_history?: ConversationMessage[];
  is_player_turn?: boolean;
  is_processing?: boolean;
  last_message_timestamp?: string;
  created_at?: string;
  started_at?: string;
  completed_at?: string;
}

export interface MeetingState {
  meeting_data: Meeting;
  conversation_history: ConversationMessage[];
  current_topic_index: number;
  is_player_turn: boolean;
  is_processing: boolean;
  meeting_complete: boolean;
}

export interface MeetingSummary {
  meetingId?: string;
  meeting_id?: string;
  sessionId?: string;
  session_id?: string;
  xpGained?: number;
  xp_earned?: number;
  overallScore?: number;
  participationScore?: number;
  participation_score?: number;
  generatedTasks?: Array<{
    taskId?: string;
    task_id?: string;
    title: string;
    source: string;
  }>;
  generated_tasks?: Array<{
    task_id: string;
    title: string;
    source: string;
  }>;
  keyDecisions?: string[];
  key_decisions?: string[];
  actionItems?: string[];
  action_items?: string[];
  feedback: {
    strengths: string[];
    improvements: string[];
  };
  earlyDeparture?: boolean;
  early_departure?: boolean;
  createdAt?: string;
  created_at?: string;
}

// Type guard functions for data filtering
export function isWorkTask(item: any): item is WorkTask {
  return (
    typeof item === 'object' &&
    item !== null &&
    'title' in item &&
    'description' in item &&
    'requirements' in item &&
    'acceptanceCriteria' in item &&
    'difficulty' in item &&
    'status' in item &&
    'xpReward' in item &&
    !('meeting_type' in item) &&
    !('participants' in item) &&
    !('estimated_duration_minutes' in item)
  );
}

export function isMeeting(item: any): item is Meeting {
  return (
    typeof item === 'object' &&
    item !== null &&
    'meeting_type' in item &&
    'participants' in item &&
    'status' in item &&
    'estimated_duration_minutes' in item &&
    !('requirements' in item) &&
    !('acceptanceCriteria' in item) &&
    !('xpReward' in item)
  );
}
