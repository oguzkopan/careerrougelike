import React, { useState, useCallback } from 'react';
import ProfessionSelector from './components/ProfessionSelector';
import GameScreen from './components/GameScreen';
import AgentDashboard from './components/AgentDashboard';
import { GameState, Profession } from './types';
import { PROFESSIONS } from './constants';
import * as apiService from './services/apiService';

const App: React.FC = () => {
  const [view, setView] = useState<'game' | 'agents'>('game');
  const [gameState, setGameState] = useState<GameState>({
    stage: 'selecting_profession',
    sessionId: null,
    playerProfile: null,
    currentTask: null,
    storyEvents: [],
    isLoading: false,
    error: null,
  });

  const handleStartGame = useCallback(async (profession: Profession, seed?: string) => {
    setGameState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const { sessionId, initialTask, playerProfile } = await apiService.startSession(profession, seed);
      setGameState({
        stage: 'interview',
        sessionId,
        playerProfile,
        currentTask: initialTask,
        storyEvents: [{ type: 'system', content: `Your interview for the ${profession.name} position is starting.` }],
        isLoading: false,
        error: null,
      });
    } catch (err) {
      setGameState(prev => ({ ...prev, isLoading: false, error: 'Failed to start a new game session.' }));
    }
  }, []);

  const handleSubmitAnswer = useCallback(async (answer: string) => {
    if (!gameState.sessionId || !gameState.currentTask) return;
    
    setGameState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const { feedback, score, nextTask, newProfile, newStoryEvent } = await apiService.submitAnswer(gameState.sessionId, gameState.currentTask.id, answer);
      
      setGameState(prev => ({
        ...prev,
        stage: nextTask ? (nextTask.type === 'event' ? 'event' : (nextTask.type === 'interview' ? 'interview' : 'working')) : 'game_over',
        playerProfile: newProfile,
        currentTask: nextTask,
        storyEvents: [...prev.storyEvents, {type: 'feedback', content: `Score: ${score}/10. ${feedback}`}, newStoryEvent],
        isLoading: false,
      }));

    } catch (err) {
      setGameState(prev => ({ ...prev, isLoading: false, error: 'Failed to submit answer.' }));
    }
  }, [gameState.sessionId, gameState.currentTask]);
  
  const handleSubmitEventChoice = useCallback(async (choice: string) => {
    if (!gameState.sessionId || !gameState.currentTask) return;

    setGameState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const { nextTask, newProfile, newStoryEvent } = await apiService.submitEventChoice(gameState.sessionId, gameState.currentTask.id, choice);

      setGameState(prev => ({
        ...prev,
        stage: 'working',
        playerProfile: newProfile,
        currentTask: nextTask,
        storyEvents: [...prev.storyEvents, newStoryEvent],
        isLoading: false,
      }));
    } catch (err) {
      setGameState(prev => ({ ...prev, isLoading: false, error: 'Failed to process event choice.' }));
    }
  }, [gameState.sessionId, gameState.currentTask]);


  if (view === 'agents') {
    return <AgentDashboard onNavigateBack={() => setView('game')} />;
  }

  if (gameState.stage === 'selecting_profession') {
    return <ProfessionSelector 
      professions={PROFESSIONS} 
      onSelectProfession={handleStartGame} 
      isLoading={gameState.isLoading}
      onNavigateToAgents={() => setView('agents')}
    />;
  }

  return (
    <GameScreen 
      gameState={gameState}
      onSubmitAnswer={handleSubmitAnswer}
      onSubmitEventChoice={handleSubmitEventChoice}
      onNavigateToAgents={() => setView('agents')}
    />
  );
};

export default App;