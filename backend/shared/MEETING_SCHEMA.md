# Meeting Firestore Schema

This document describes the Firestore schema for meetings in the Career Roguelike game.

## Collection: `meetings`

Each meeting document has the following structure:

### Core Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `meeting_id` | string | Yes | Unique identifier for the meeting |
| `session_id` | string | Yes | Session this meeting belongs to |
| `meeting_type` | string | Yes | Type of meeting (team_standup, one_on_one, project_review, stakeholder_presentation, performance_review) |
| `title` | string | Yes | Meeting title |
| `context` | string | Yes | Meeting context and background |
| `status` | string | Yes | Current status (scheduled, in_progress, completed, left_early) |

### Participants

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `participants` | array | Yes | Array of participant objects |
| `participants[].id` | string | Yes | Unique participant identifier |
| `participants[].name` | string | Yes | Participant name |
| `participants[].role` | string | Yes | Participant role |
| `participants[].personality` | string | Yes | Participant personality trait |
| `participants[].avatar_color` | string | Yes | Avatar color for UI |

### Topics

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `topics` | array | Yes | Array of discussion topic objects |
| `topics[].id` | string | Yes | Unique topic identifier |
| `topics[].question` | string | Yes | Topic question or prompt |
| `topics[].context` | string | Yes | Topic context |
| `topics[].expected_points` | array | Yes | Expected key points for responses |
| `topics[].ai_discussion_prompts` | array | Yes | Prompts for AI discussion generation |

### Conversation State

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `conversation_history` | array | Yes | Array of conversation message objects |
| `current_topic_index` | number | Yes | Index of current topic being discussed |
| `is_player_turn` | boolean | Yes | Whether it's currently the player's turn to speak |
| `last_message_timestamp` | string | No | ISO 8601 timestamp of the last message |

### Conversation Message Structure

Each message in `conversation_history` has:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique message identifier |
| `type` | string | Yes | Message type (topic_intro, ai_response, player_response, player_turn) |
| `content` | string | Yes | Message content |
| `timestamp` | string | Yes | ISO 8601 timestamp |
| `sequence_number` | number | Yes | Sequential number for ordering |
| `participant_id` | string | No | ID of participant (for AI messages) |
| `participant_name` | string | No | Name of participant |
| `participant_role` | string | No | Role of participant |
| `sentiment` | string | No | Message sentiment (positive, neutral, constructive, challenging) |

### Meeting Metadata

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `objective` | string | Yes | Meeting objective |
| `estimated_duration_minutes` | number | Yes | Estimated duration in minutes |
| `priority` | string | Yes | Meeting priority (optional, recommended, required) |
| `elapsed_time_minutes` | number | Yes | Actual elapsed time |

### Timestamps

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `scheduled_time` | string | No | ISO 8601 scheduled time |
| `started_at` | string | No | ISO 8601 start time |
| `completed_at` | string | No | ISO 8601 completion time |
| `created_at` | string | Yes | ISO 8601 creation time |
| `updated_at` | string | Yes | ISO 8601 last update time |

## Indexes

The following composite indexes are required for efficient queries:

### Index 1: Session + Created At
- Collection: `meetings`
- Fields:
  - `session_id` (Ascending)
  - `created_at` (Descending)
- Purpose: Get all meetings for a session ordered by creation time

### Index 2: Session + Status + Created At
- Collection: `meetings`
- Fields:
  - `session_id` (Ascending)
  - `status` (Ascending)
  - `created_at` (Ascending)
- Purpose: Get active meetings (scheduled or in_progress) for a session

### Index 3: Session + Last Message Timestamp
- Collection: `meetings`
- Fields:
  - `session_id` (Ascending)
  - `last_message_timestamp` (Descending)
- Purpose: Get meetings with recent activity

## Example Document

```json
{
  "meeting_id": "meeting-abc123def456",
  "session_id": "session-xyz789",
  "meeting_type": "team_standup",
  "title": "Daily Team Standup",
  "context": "Daily sync to discuss progress and blockers",
  "status": "in_progress",
  "participants": [
    {
      "id": "participant-1",
      "name": "Sarah Chen",
      "role": "Engineering Manager",
      "personality": "supportive",
      "avatar_color": "#4A90E2"
    },
    {
      "id": "participant-2",
      "name": "Mike Johnson",
      "role": "Senior Engineer",
      "personality": "analytical",
      "avatar_color": "#7B68EE"
    }
  ],
  "topics": [
    {
      "id": "topic-1",
      "question": "What did you work on yesterday?",
      "context": "Share your progress from the previous day",
      "expected_points": [
        "Specific tasks completed",
        "Progress on ongoing work",
        "Any achievements"
      ],
      "ai_discussion_prompts": [
        "Share what you worked on",
        "Mention any challenges faced"
      ]
    }
  ],
  "conversation_history": [
    {
      "id": "msg-001",
      "type": "topic_intro",
      "content": "Let's start with our first topic: What did you work on yesterday?",
      "timestamp": "2025-11-10T10:00:00.000Z",
      "sequence_number": 0
    },
    {
      "id": "msg-002",
      "type": "ai_response",
      "participant_id": "participant-1",
      "participant_name": "Sarah Chen",
      "participant_role": "Engineering Manager",
      "content": "I spent most of yesterday in planning meetings for Q4.",
      "sentiment": "neutral",
      "timestamp": "2025-11-10T10:00:05.000Z",
      "sequence_number": 1
    },
    {
      "id": "msg-003",
      "type": "player_turn",
      "content": "Your turn to speak",
      "timestamp": "2025-11-10T10:00:10.000Z",
      "sequence_number": 2
    }
  ],
  "current_topic_index": 0,
  "is_player_turn": true,
  "last_message_timestamp": "2025-11-10T10:00:10.000Z",
  "objective": "Sync on daily progress and identify blockers",
  "estimated_duration_minutes": 15,
  "priority": "recommended",
  "elapsed_time_minutes": 0,
  "scheduled_time": "2025-11-10T10:00:00.000Z",
  "started_at": "2025-11-10T10:00:00.000Z",
  "completed_at": null,
  "created_at": "2025-11-10T09:55:00.000Z",
  "updated_at": "2025-11-10T10:00:10.000Z"
}
```

## Migration Notes

When migrating existing meetings to this schema:

1. Add `is_player_turn` field (default: `false`)
2. Add `last_message_timestamp` field (default: `null` or timestamp of last message)
3. Add `sequence_number` to all messages in `conversation_history` (starting from 0)
4. Ensure all messages have `timestamp` field
5. Deploy new Firestore indexes before enabling new query patterns

## Usage with MeetingStateManager

The `MeetingStateManager` class provides methods to interact with this schema:

- `initialize_meeting()` - Creates a new meeting with all required fields
- `append_messages()` - Atomically appends messages with sequence numbers
- `get_messages_since()` - Retrieves messages after a specific message ID
- `set_player_turn()` - Updates the `is_player_turn` flag
- `get_meeting_state()` - Retrieves complete meeting state
- `mark_meeting_complete()` - Marks meeting as completed
- `update_meeting_status()` - Updates meeting status
- `update_current_topic()` - Updates current topic index
