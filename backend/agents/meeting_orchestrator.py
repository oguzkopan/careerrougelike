"""
Meeting Orchestrator

Orchestrates multi-turn AI conversations with proper state management for the
Interactive Meeting System. Manages the flow of conversation between AI participants
and the player, including topic initialization, AI discussion generation, and
player response processing.

Includes comprehensive error handling for Firestore operations, message generation,
and state management.
"""

from typing import Dict, Any, List, Optional
from datetime import datetime
import logging
import json
import time

from shared.meeting_state_manager import MeetingStateManager
from shared.metrics_tracker import get_metrics_tracker
from shared.meeting_models import (
    generate_message_id,
    create_topic_intro_message,
    ConversationMessage
)
from agents.meeting_conversation_agent import (
    meeting_conversation_agent,
    format_participants_for_context,
    format_conversation_history,
    format_topic_for_context,
    determine_message_count,
    post_process_conversation_messages,
    validate_conversation_messages
)
from shared.error_handler import (
    get_error_metrics,
    log_detailed_error,
    create_fallback_meeting_message,
    MeetingOperationError,
    retry_with_exponential_backoff
)

logger = logging.getLogger(__name__)


class MeetingOrchestrator:
    """
    Orchestrates meeting conversation flow with proper state management.
    
    This class manages:
    - Topic initialization and introduction
    - Multi-turn AI discussion generation
    - Player response processing
    - Turn management (when to prompt player)
    - Topic transitions
    - Meeting completion
    """
    
    def __init__(self):
        """Initialize the orchestrator with state manager and metrics tracker."""
        self.state_manager = MeetingStateManager()
        self.metrics_tracker = get_metrics_tracker()
    
    async def start_topic_discussion(
        self,
        meeting_id: str,
        topic_index: int
    ) -> List[Dict[str, Any]]:
        """
        Start discussion on a new topic with comprehensive error handling.
        
        This method:
        1. Adds topic introduction message to conversation history
        2. Generates 2-4 AI participant messages discussing the topic
        3. Stores all messages in Firestore atomically with retry
        4. Adds "player_turn" signal message
        5. Sets is_player_turn = true
        6. Returns messages for immediate display
        
        Args:
            meeting_id: Unique meeting identifier
            topic_index: Index of the topic to start
        
        Returns:
            List of message dictionaries including topic intro, AI discussion,
            and player_turn signal
        
        Raises:
            ValueError: If meeting not found or topic index invalid
            MeetingOperationError: If discussion generation or storage fails
        """
        metrics = get_error_metrics()
        
        try:
            # Get meeting state with retry
            meeting_data = await self._get_meeting_state_with_retry(meeting_id)
            
            # Validate topic index
            topics = meeting_data.get('topics', [])
            if topic_index < 0 or topic_index >= len(topics):
                raise ValueError(f"Invalid topic index {topic_index}")
            
            current_topic = topics[topic_index]
            
            # Update current topic index in Firestore with retry
            await self._update_current_topic_with_retry(meeting_id, topic_index)
            
            # Create topic introduction message
            topic_intro_msg = {
                'id': generate_message_id(),
                'type': 'topic_intro',
                'content': f"{current_topic['question']}\n\n{current_topic.get('context', '')}",
                'timestamp': datetime.utcnow().isoformat()
            }
            
            # Store topic intro message with retry
            await self._append_messages_with_retry(meeting_id, [topic_intro_msg])
            
            # Generate initial AI discussion with fallback
            try:
                generation_start_time = time.time()
                ai_messages = await self.generate_ai_discussion(
                    meeting_id=meeting_id,
                    stage="initial_discussion"
                )
                generation_latency = time.time() - generation_start_time
                
                # Record message generation metrics
                self.metrics_tracker.record_meeting_message_generation(
                    meeting_id,
                    len(ai_messages),
                    generation_latency,
                    "initial_discussion"
                )
            except Exception as e:
                logger.error(f"AI discussion generation failed: {str(e)}, using fallback")
                metrics.record_meeting_operation_failure(
                    'generate_ai_discussion',
                    'generation_failed',
                    meeting_id
                )
                # Create fallback message
                ai_messages = [create_fallback_meeting_message(
                    "Meeting Participant",
                    f"Discussion generation failed: {str(e)}"
                )]
            
            # Create player turn signal message
            player_turn_msg = {
                'id': generate_message_id(),
                'type': 'player_turn',
                'content': 'Your turn to speak',
                'timestamp': datetime.utcnow().isoformat()
            }
            
            # Store AI messages and player turn signal with retry
            all_messages = ai_messages + [player_turn_msg]
            await self._append_messages_with_retry(meeting_id, all_messages)
            
            # Set player turn flag with retry
            await self._set_player_turn_with_retry(meeting_id, True)
            
            # Return all messages for display
            result_messages = [topic_intro_msg] + all_messages
            
            logger.info(
                f"Started topic {topic_index} for meeting {meeting_id}, "
                f"generated {len(ai_messages)} AI messages"
            )
            
            return result_messages
            
        except ValueError:
            raise
        except Exception as e:
            logger.error(f"Failed to start topic discussion for meeting {meeting_id}: {str(e)}")
            metrics.record_meeting_operation_failure(
                'start_topic_discussion',
                type(e).__name__,
                meeting_id
            )
            log_detailed_error(
                'start_topic_discussion',
                e,
                {'meeting_id': meeting_id, 'topic_index': topic_index}
            )
            raise MeetingOperationError(f"Failed to start topic discussion: {str(e)}")
    
    async def generate_ai_discussion(
        self,
        meeting_id: str,
        stage: str
    ) -> List[Dict[str, Any]]:
        """
        Generate AI participant discussion messages with error handling and fallback.
        
        This method:
        1. Loads meeting state and conversation history
        2. Formats context for conversation agent
        3. Calls meeting_conversation_agent with stage parameter
        4. Validates generated messages
        5. Assigns unique IDs and timestamps
        6. Returns messages (does NOT store them - caller handles storage)
        
        Args:
            meeting_id: Unique meeting identifier
            stage: "initial_discussion" or "response_to_player"
        
        Returns:
            List of AI message dictionaries ready for storage
        
        Raises:
            ValueError: If meeting not found or stage invalid
            MeetingOperationError: If message generation fails after retries
        """
        metrics = get_error_metrics()
        max_retries = 2  # Fewer retries for message generation to avoid delays
        
        for attempt in range(max_retries):
            try:
                # Validate stage
                if stage not in ["initial_discussion", "response_to_player"]:
                    raise ValueError(f"Invalid stage: {stage}")
                
                # Get meeting state
                meeting_data = self.state_manager.get_meeting_state(meeting_id)
                
                # Extract meeting components
                meeting_type = meeting_data.get('meeting_type', '')
                meeting_context = meeting_data.get('context', '')
                participants = meeting_data.get('participants', [])
                topics = meeting_data.get('topics', [])
                current_topic_index = meeting_data.get('current_topic_index', 0)
                conversation_history = meeting_data.get('conversation_history', [])
                
                # Get current topic
                if current_topic_index >= len(topics):
                    raise ValueError(f"Invalid topic index {current_topic_index}")
                
                current_topic = topics[current_topic_index]
                
                # Get player's last response if stage is response_to_player
                player_response = ""
                if stage == "response_to_player":
                    # Find the most recent player response
                    for msg in reversed(conversation_history):
                        if msg.get('type') == 'player_response':
                            player_response = msg.get('content', '')
                            break
                
                # Format context for agent
                participants_context = format_participants_for_context(participants)
                history_context = format_conversation_history(conversation_history)
                topic_context = format_topic_for_context(current_topic)
                
                # Prepare agent input
                agent_input = {
                    'meeting_type': meeting_type,
                    'meeting_context': meeting_context,
                    'current_topic': current_topic.get('question', ''),
                    'topic_context': topic_context,
                    'participants': participants_context,
                    'conversation_history': history_context,
                    'stage': stage,
                    'player_response': player_response if stage == "response_to_player" else ""
                }
                
                # Call conversation agent
                logger.info(f"Generating AI discussion for meeting {meeting_id}, stage: {stage} (attempt {attempt + 1})")
                
                result = await meeting_conversation_agent.run(agent_input)
                
                # Extract messages from result
                if isinstance(result, dict) and 'conversation_messages' in result:
                    raw_messages = result['conversation_messages']
                else:
                    raw_messages = result
                
                # Parse if string
                if isinstance(raw_messages, str):
                    try:
                        raw_messages = json.loads(raw_messages)
                    except json.JSONDecodeError as e:
                        logger.error(f"Failed to parse agent output as JSON: {str(e)}")
                        if attempt == max_retries - 1:
                            raise MeetingOperationError("Agent returned invalid JSON")
                        continue
                
                # Validate messages
                if not isinstance(raw_messages, list):
                    logger.error("Agent did not return a list of messages")
                    if attempt == max_retries - 1:
                        raise MeetingOperationError("Agent did not return a list of messages")
                    continue
                
                if not validate_conversation_messages(raw_messages):
                    logger.error("Generated messages failed validation")
                    if attempt == max_retries - 1:
                        raise MeetingOperationError("Generated messages failed validation")
                    continue
                
                # Post-process messages (add IDs, timestamps, etc.)
                processed_messages = post_process_conversation_messages(
                    raw_messages,
                    participants
                )
                
                logger.info(
                    f"Generated {len(processed_messages)} AI messages for meeting {meeting_id}"
                )
                
                return processed_messages
                
            except ValueError:
                raise
            except MeetingOperationError:
                if attempt == max_retries - 1:
                    raise
            except Exception as e:
                logger.error(f"Failed to generate AI discussion (attempt {attempt + 1}): {str(e)}")
                metrics.record_meeting_operation_failure(
                    'generate_ai_discussion',
                    type(e).__name__,
                    meeting_id
                )
                
                if attempt == max_retries - 1:
                    log_detailed_error(
                        'generate_ai_discussion',
                        e,
                        {'meeting_id': meeting_id, 'stage': stage}
                    )
                    raise MeetingOperationError(f"Failed to generate AI discussion: {str(e)}")
                
                # Wait before retry
                time.sleep(0.5 * (2 ** attempt))
    
    async def process_player_response(
        self,
        meeting_id: str,
        topic_id: str,
        response: str
    ) -> Dict[str, Any]:
        """
        Process player's response to a topic with comprehensive error handling.
        
        This method:
        1. Stores player response in conversation history with retry
        2. Sets is_player_turn = false with retry
        3. Generates AI reactions (1-3 messages) with fallback
        4. Stores AI messages in Firestore with retry
        5. Checks if topic is complete
        6. If complete, advances to next topic or ends meeting
        7. Returns response data with next state
        
        Args:
            meeting_id: Unique meeting identifier
            topic_id: ID of the topic being responded to
            response: Player's response text
        
        Returns:
            Dictionary containing:
                - player_message: The stored player message
                - ai_messages: List of AI reaction messages
                - topic_complete: Boolean indicating if topic is done
                - meeting_complete: Boolean indicating if meeting is done
                - next_topic_index: Index of next topic (if any)
        
        Raises:
            ValueError: If meeting not found or topic ID invalid
            MeetingOperationError: If response processing fails
        """
        metrics = get_error_metrics()
        
        try:
            # Get meeting state with retry
            meeting_data = await self._get_meeting_state_with_retry(meeting_id)
            
            # Validate topic
            topics = meeting_data.get('topics', [])
            current_topic_index = meeting_data.get('current_topic_index', 0)
            
            if current_topic_index >= len(topics):
                raise ValueError(f"Invalid topic index {current_topic_index}")
            
            current_topic = topics[current_topic_index]
            
            if current_topic.get('id') != topic_id:
                raise ValueError(f"Topic ID mismatch: expected {current_topic.get('id')}, got {topic_id}")
            
            # Create player response message
            player_message = {
                'id': generate_message_id(),
                'type': 'player_response',
                'participant_name': 'You',
                'content': response,
                'timestamp': datetime.utcnow().isoformat()
            }
            
            # Store player message with retry
            await self._append_messages_with_retry(meeting_id, [player_message])
            
            # Set player turn to false with retry
            await self._set_player_turn_with_retry(meeting_id, False)
            
            # Generate AI reactions with fallback
            try:
                generation_start_time = time.time()
                ai_messages = await self.generate_ai_discussion(
                    meeting_id=meeting_id,
                    stage="response_to_player"
                )
                generation_latency = time.time() - generation_start_time
                
                # Record message generation metrics
                self.metrics_tracker.record_meeting_message_generation(
                    meeting_id,
                    len(ai_messages),
                    generation_latency,
                    "response_to_player"
                )
            except Exception as e:
                logger.error(f"AI reaction generation failed: {str(e)}, using fallback")
                metrics.record_meeting_operation_failure(
                    'generate_ai_reactions',
                    'generation_failed',
                    meeting_id
                )
                # Create fallback message
                ai_messages = [create_fallback_meeting_message(
                    "Meeting Participant",
                    f"Reaction generation failed: {str(e)}"
                )]
            
            # Store AI messages with retry
            await self._append_messages_with_retry(meeting_id, ai_messages)
            
            # Determine if topic is complete and what's next
            # For now, we consider a topic complete after one player response
            # In the future, this could be more sophisticated
            topic_complete = True
            next_topic_index = current_topic_index + 1
            meeting_complete = next_topic_index >= len(topics)
            
            # If meeting is complete, mark it with retry
            if meeting_complete:
                for attempt in range(3):
                    try:
                        self.state_manager.mark_meeting_complete(meeting_id)
                        logger.info(f"Meeting {meeting_id} completed")
                        
                        # Record meeting completion metrics
                        # Calculate duration and topics completed
                        meeting_data = self.state_manager.get_meeting_state(meeting_id)
                        started_at = meeting_data.get('started_at')
                        if started_at:
                            start_time = datetime.fromisoformat(started_at)
                            end_time = datetime.utcnow()
                            duration_minutes = (end_time - start_time).total_seconds() / 60
                        else:
                            duration_minutes = 0
                        
                        topics_completed = len(meeting_data.get('topics', []))
                        
                        self.metrics_tracker.record_meeting_completion(
                            meeting_id,
                            duration_minutes,
                            topics_completed
                        )
                        
                        break
                    except Exception as e:
                        if attempt == 2:
                            logger.error(f"Failed to mark meeting complete: {str(e)}")
                        else:
                            time.sleep(0.5 * (2 ** attempt))
            
            logger.info(
                f"Processed player response for meeting {meeting_id}, "
                f"generated {len(ai_messages)} AI reactions, "
                f"topic_complete={topic_complete}, meeting_complete={meeting_complete}"
            )
            
            return {
                'player_message': player_message,
                'ai_messages': ai_messages,
                'topic_complete': topic_complete,
                'meeting_complete': meeting_complete,
                'next_topic_index': next_topic_index if not meeting_complete else None
            }
            
        except ValueError:
            raise
        except Exception as e:
            logger.error(f"Failed to process player response for meeting {meeting_id}: {str(e)}")
            metrics.record_meeting_operation_failure(
                'process_player_response',
                type(e).__name__,
                meeting_id
            )
            log_detailed_error(
                'process_player_response',
                e,
                {'meeting_id': meeting_id, 'topic_id': topic_id}
            )
            raise MeetingOperationError(f"Failed to process player response: {str(e)}")


    # Helper methods with retry logic for Firestore operations
    
    async def _get_meeting_state_with_retry(
        self,
        meeting_id: str,
        max_retries: int = 3
    ) -> Dict[str, Any]:
        """Get meeting state with retry logic."""
        for attempt in range(max_retries):
            try:
                return self.state_manager.get_meeting_state(meeting_id)
            except Exception as e:
                if attempt == max_retries - 1:
                    raise
                logger.warning(f"Failed to get meeting state (attempt {attempt + 1}): {str(e)}")
                time.sleep(0.5 * (2 ** attempt))
    
    async def _append_messages_with_retry(
        self,
        meeting_id: str,
        messages: List[Dict[str, Any]],
        max_retries: int = 3
    ) -> None:
        """Append messages with retry logic."""
        for attempt in range(max_retries):
            try:
                self.state_manager.append_messages(meeting_id, messages)
                return
            except Exception as e:
                if attempt == max_retries - 1:
                    raise
                logger.warning(f"Failed to append messages (attempt {attempt + 1}): {str(e)}")
                time.sleep(0.5 * (2 ** attempt))
    
    async def _set_player_turn_with_retry(
        self,
        meeting_id: str,
        is_player_turn: bool,
        max_retries: int = 3
    ) -> None:
        """Set player turn with retry logic."""
        for attempt in range(max_retries):
            try:
                self.state_manager.set_player_turn(meeting_id, is_player_turn)
                return
            except Exception as e:
                if attempt == max_retries - 1:
                    raise
                logger.warning(f"Failed to set player turn (attempt {attempt + 1}): {str(e)}")
                time.sleep(0.5 * (2 ** attempt))
    
    async def _update_current_topic_with_retry(
        self,
        meeting_id: str,
        topic_index: int,
        max_retries: int = 3
    ) -> None:
        """Update current topic with retry logic."""
        for attempt in range(max_retries):
            try:
                self.state_manager.update_current_topic(meeting_id, topic_index)
                return
            except Exception as e:
                if attempt == max_retries - 1:
                    raise
                logger.warning(f"Failed to update current topic (attempt {attempt + 1}): {str(e)}")
                time.sleep(0.5 * (2 ** attempt))


# Singleton instance
_orchestrator_instance = None


def get_meeting_orchestrator() -> MeetingOrchestrator:
    """
    Get the singleton MeetingOrchestrator instance.
    
    Returns:
        MeetingOrchestrator instance
    """
    global _orchestrator_instance
    if _orchestrator_instance is None:
        _orchestrator_instance = MeetingOrchestrator()
    return _orchestrator_instance
