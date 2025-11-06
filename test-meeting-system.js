#!/usr/bin/env node

/**
 * Test Script for Meeting System
 * 
 * This script tests the virtual meeting system:
 * - Join meeting
 * - Respond to meeting topics
 * - AI colleague responses
 * - Manager meeting request
 * 
 * Requirements tested: 24.1, 24.2, 24.3, 24.4, 24.5, 24.6, 25.1, 25.2, 25.3
 */

const API_BASE_URL = process.env.API_BASE_URL || 'https://career-rl-backend-1086514937351.europe-west1.run.app';

// ANSI color codes for better output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(80));
  log(title, 'bright');
  console.log('='.repeat(80) + '\n');
}

function logSuccess(message) {
  log(`✓ ${message}`, 'green');
}

function logError(message) {
  log(`✗ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ ${message}`, 'cyan');
}

function logWarning(message) {
  log(`⚠ ${message}`, 'yellow');
}

async function makeRequest(endpoint, method = 'GET', body = null) {
  const url = `${API_BASE_URL}${endpoint}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  logInfo(`${method} ${endpoint}`);
  const response = await fetch(url, options);
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }
  
  const data = await response.json();
  return data;
}

async function createSession() {
  logSection('Creating Test Session');
  const session = await makeRequest('/sessions', 'POST', {
    profession: 'ios_engineer',
    level: 5,
  });
  logSuccess(`Session created: ${session.session_id}`);
  return session.session_id;
}

async function acceptJob(sessionId) {
  logSection('Setting Up Job for Testing');
  
  // Generate jobs
  logInfo('Generating job listings...');
  const jobs = await makeRequest(`/sessions/${sessionId}/jobs/generate`, 'POST', {
    player_level: 5,
    count: 3,
  });
  
  if (!jobs.jobs || jobs.jobs.length === 0) {
    throw new Error('No jobs generated');
  }
  
  const job = jobs.jobs[0];
  logSuccess(`Found job: ${job.position} at ${job.company_name}`);
  
  // Start interview
  logInfo('Starting interview...');
  const interview = await makeRequest(
    `/sessions/${sessionId}/jobs/${job.id}/interview`,
    'POST'
  );
  
  // Submit perfect answers to pass
  logInfo('Submitting interview answers...');
  const answers = {};
  interview.questions.forEach((q) => {
    answers[q.id] = q.expected_answer || `I have over 5 years of extensive experience with this technology and have successfully implemented similar solutions in multiple production projects. I deeply understand the core concepts, architectural patterns, and industry best practices. I have led teams in implementing these solutions and have mentored junior developers. I stay current with the latest developments and continuously improve my skills through hands-on projects and professional development. I can provide specific examples of how I've applied these concepts to solve real-world business problems, including performance optimization, scalability improvements, and user experience enhancements. I'm confident in my ability to contribute immediately and add significant value to your team.`;
  });
  
  const result = await makeRequest(
    `/sessions/${sessionId}/jobs/${job.id}/interview/submit`,
    'POST',
    { answers }
  );
  
  if (!result.passed) {
    throw new Error('Failed interview - cannot proceed with meeting testing');
  }
  
  logSuccess(`Interview passed with score: ${result.overall_score}/100`);
  
  // Accept job offer
  logInfo('Accepting job offer...');
  await makeRequest(`/sessions/${sessionId}/jobs/${job.id}/accept`, 'POST');
  logSuccess('Job accepted - ready to test meetings');
  
  return job;
}

async function testGenerateMeeting(sessionId, meetingType) {
  logSection(`TEST: Generate ${meetingType} Meeting (Requirement 24.1)`);
  
  logInfo(`Generating ${meetingType} meeting...`);
  const meeting = await makeRequest(
    `/sessions/${sessionId}/meetings/generate`,
    'POST',
    { meeting_type: meetingType }
  );
  
  // Verify meeting structure (Requirement 24.2)
  if (!meeting.id) {
    logError('Meeting missing id field');
    return null;
  }
  logSuccess(`Meeting generated with ID: ${meeting.id}`);
  
  if (!meeting.title) {
    logError('Meeting missing title field');
    return null;
  }
  logSuccess(`Meeting title: ${meeting.title}`);
  
  if (!meeting.context) {
    logError('Meeting missing context field');
    return null;
  }
  logSuccess(`Meeting context: ${meeting.context.substring(0, 100)}...`);
  
  // Verify participants (Requirement 24.3)
  if (!meeting.participants || meeting.participants.length === 0) {
    logError('Meeting missing participants');
    return null;
  }
  logSuccess(`Meeting has ${meeting.participants.length} participants`);
  
  log('\nParticipants:', 'cyan');
  meeting.participants.forEach(p => {
    log(`  - ${p.name} (${p.role}) - ${p.personality}`, 'reset');
  });
  
  // Verify topics (Requirement 24.3)
  if (!meeting.topics || meeting.topics.length < 3 || meeting.topics.length > 5) {
    logError(`Expected 3-5 topics, got ${meeting.topics?.length || 0}`);
    return null;
  }
  logSuccess(`Meeting has ${meeting.topics.length} discussion topics`);
  
  log('\nDiscussion Topics:', 'cyan');
  meeting.topics.forEach((t, idx) => {
    log(`  ${idx + 1}. ${t.question}`, 'reset');
    log(`     Context: ${t.context}`, 'reset');
  });
  
  if (!meeting.objective) {
    logError('Meeting missing objective field');
    return null;
  }
  logSuccess(`Meeting objective: ${meeting.objective}`);
  
  logSuccess(`${meetingType} meeting generation PASSED`);
  return meeting;
}

async function testJoinMeeting(sessionId, meetingId) {
  logSection('TEST: Join Meeting (Requirement 24.4)');
  
  logInfo(`Retrieving meeting ${meetingId}...`);
  const meeting = await makeRequest(
    `/sessions/${sessionId}/meetings/${meetingId}`,
    'GET'
  );
  
  if (!meeting.id || meeting.id !== meetingId) {
    logError('Failed to retrieve meeting');
    return false;
  }
  logSuccess('Successfully joined meeting');
  
  if (meeting.status !== 'active') {
    logError(`Expected meeting status 'active', got '${meeting.status}'`);
    return false;
  }
  logSuccess('Meeting status is active');
  
  if (meeting.current_topic_index !== 0) {
    logError(`Expected current_topic_index 0, got ${meeting.current_topic_index}`);
    return false;
  }
  logSuccess('Meeting starts at first topic');
  
  logSuccess('Join meeting test PASSED');
  return true;
}

async function testRespondToTopic(sessionId, meetingId, topic, responseText) {
  logInfo(`Responding to topic: ${topic.question.substring(0, 50)}...`);
  
  const response = await makeRequest(
    `/sessions/${sessionId}/meetings/${meetingId}/respond`,
    'POST',
    {
      topic_id: topic.id,
      response: responseText
    }
  );
  
  // Verify AI responses (Requirement 24.7)
  if (!response.ai_responses || response.ai_responses.length === 0) {
    logError('No AI colleague responses received');
    return null;
  }
  logSuccess(`Received ${response.ai_responses.length} AI colleague responses`);
  
  log('\nAI Colleague Responses:', 'cyan');
  response.ai_responses.forEach(aiResp => {
    log(`  ${aiResp.participant_name}: ${aiResp.response}`, 'reset');
    log(`  Sentiment: ${aiResp.sentiment}`, 'reset');
    if (aiResp.follow_up_question) {
      log(`  Follow-up: ${aiResp.follow_up_question}`, 'reset');
    }
  });
  
  // Verify evaluation (Requirement 24.6)
  if (!response.evaluation) {
    logError('No evaluation received');
    return null;
  }
  logSuccess(`Response evaluated with score: ${response.evaluation.score}/100`);
  
  if (response.evaluation.feedback) {
    log(`Feedback: ${response.evaluation.feedback}`, 'cyan');
  }
  
  return response;
}

async function testMeetingFlow(sessionId) {
  logSection('TEST: Complete Meeting Flow (Requirements 24.4, 24.5, 24.6, 24.7)');
  
  // Generate a one-on-one meeting
  const meeting = await testGenerateMeeting(sessionId, 'one_on_one');
  if (!meeting) {
    logError('Failed to generate meeting');
    return false;
  }
  
  // Join the meeting
  const joined = await testJoinMeeting(sessionId, meeting.id);
  if (!joined) {
    logError('Failed to join meeting');
    return false;
  }
  
  // Respond to each topic
  logSection('TEST: Respond to Meeting Topics (Requirement 24.5)');
  
  const responses = [];
  for (let i = 0; i < meeting.topics.length; i++) {
    const topic = meeting.topics[i];
    
    log(`\nTopic ${i + 1}/${meeting.topics.length}:`, 'bright');
    log(topic.question, 'cyan');
    
    // Provide a comprehensive response
    const responseText = `Thank you for bringing this up. Based on my experience, I believe we should focus on ${topic.expected_points?.[0] || 'the key objectives'}. I've successfully handled similar situations in the past by taking a structured approach. First, I would ${topic.expected_points?.[1] || 'analyze the requirements carefully'}. Then, I would ${topic.expected_points?.[2] || 'implement a solution that addresses all stakeholder needs'}. I'm confident this approach will deliver the results we're looking for. I'm happy to discuss this further and answer any questions.`;
    
    const response = await testRespondToTopic(sessionId, meeting.id, topic, responseText);
    if (!response) {
      logError(`Failed to respond to topic ${i + 1}`);
      return false;
    }
    
    responses.push(response);
    
    // Verify next topic index
    if (response.next_topic_index !== i + 1) {
      logError(`Expected next_topic_index ${i + 1}, got ${response.next_topic_index}`);
      return false;
    }
    logSuccess(`Advanced to next topic (${i + 1}/${meeting.topics.length})`);
  }
  
  // Verify meeting completion flag
  const lastResponse = responses[responses.length - 1];
  if (!lastResponse.meeting_complete) {
    logError('Meeting should be marked as complete after all topics');
    return false;
  }
  logSuccess('Meeting marked as complete after all topics');
  
  // Complete the meeting
  logSection('TEST: Complete Meeting and Award XP (Requirement 24.6)');
  
  logInfo('Completing meeting...');
  const completion = await makeRequest(
    `/sessions/${sessionId}/meetings/${meeting.id}/complete`,
    'POST'
  );
  
  if (!completion.overall_score) {
    logError('Meeting completion missing overall_score');
    return false;
  }
  logSuccess(`Overall meeting score: ${completion.overall_score}/100`);
  
  if (!completion.xp_gained || completion.xp_gained <= 0) {
    logError('Meeting completion should award XP');
    return false;
  }
  logSuccess(`XP gained from meeting: ${completion.xp_gained}`);
  
  if (completion.level_up) {
    logSuccess(`Level up! New level: ${completion.new_level}`);
  }
  
  logSuccess('Complete meeting flow test PASSED');
  return true;
}

async function testDifferentMeetingTypes(sessionId) {
  logSection('TEST: Different Meeting Types (Requirement 24.2)');
  
  const meetingTypes = [
    'one_on_one',
    'team_meeting',
    'stakeholder_presentation',
    'performance_review',
    'project_update',
    'feedback_session'
  ];
  
  const results = {};
  
  for (const meetingType of meetingTypes) {
    try {
      const meeting = await testGenerateMeeting(sessionId, meetingType);
      results[meetingType] = meeting !== null;
      
      if (meeting) {
        // Verify meeting type is appropriate
        if (meeting.meeting_type !== meetingType) {
          logError(`Expected meeting_type '${meetingType}', got '${meeting.meeting_type}'`);
          results[meetingType] = false;
        }
      }
    } catch (error) {
      logError(`Failed to generate ${meetingType}: ${error.message}`);
      results[meetingType] = false;
    }
  }
  
  log('\nMeeting Type Generation Results:', 'cyan');
  let allPassed = true;
  for (const [type, passed] of Object.entries(results)) {
    if (passed) {
      logSuccess(`${type}: PASSED`);
    } else {
      logError(`${type}: FAILED`);
      allPassed = false;
    }
  }
  
  return allPassed;
}

async function testAIColleagueResponses(sessionId) {
  logSection('TEST: AI Colleague Responses (Requirement 24.7)');
  
  // Generate a team meeting (more participants)
  const meeting = await testGenerateMeeting(sessionId, 'team_meeting');
  if (!meeting) {
    logError('Failed to generate team meeting');
    return false;
  }
  
  // Respond to first topic
  const topic = meeting.topics[0];
  const responseText = 'I think we should prioritize the user experience improvements first, as they will have the most immediate impact on customer satisfaction.';
  
  const response = await testRespondToTopic(sessionId, meeting.id, topic, responseText);
  if (!response) {
    logError('Failed to get AI responses');
    return false;
  }
  
  // Verify each AI response has required fields
  let allValid = true;
  for (const aiResp of response.ai_responses) {
    if (!aiResp.participant_name) {
      logError('AI response missing participant_name');
      allValid = false;
    }
    
    if (!aiResp.response || aiResp.response.length < 10) {
      logError('AI response missing or too short');
      allValid = false;
    }
    
    if (!aiResp.sentiment) {
      logError('AI response missing sentiment');
      allValid = false;
    }
    
    // Verify sentiment is valid
    const validSentiments = ['positive', 'neutral', 'constructive', 'concerned'];
    if (!validSentiments.includes(aiResp.sentiment)) {
      logError(`Invalid sentiment: ${aiResp.sentiment}`);
      allValid = false;
    }
  }
  
  if (allValid) {
    logSuccess('All AI colleague responses are valid');
    return true;
  } else {
    logError('Some AI colleague responses are invalid');
    return false;
  }
}

async function testManagerMeetingRequest(sessionId) {
  logSection('TEST: Manager Meeting Request (Requirements 25.1, 25.2, 25.3)');
  
  // Generate a performance review meeting (manager meeting)
  logInfo('Generating manager meeting (performance review)...');
  const meeting = await testGenerateMeeting(sessionId, 'performance_review');
  if (!meeting) {
    logError('Failed to generate manager meeting');
    return false;
  }
  
  // Verify it's a manager meeting
  const hasManager = meeting.participants.some(p => 
    p.role.toLowerCase().includes('manager') || 
    p.role.toLowerCase().includes('supervisor')
  );
  
  if (!hasManager) {
    logError('Performance review should include a manager participant');
    return false;
  }
  logSuccess('Manager meeting includes manager participant');
  
  // Verify meeting topics are appropriate for manager meeting
  const hasPerformanceTopics = meeting.topics.some(t => 
    t.question.toLowerCase().includes('performance') ||
    t.question.toLowerCase().includes('goal') ||
    t.question.toLowerCase().includes('feedback') ||
    t.question.toLowerCase().includes('achievement')
  );
  
  if (!hasPerformanceTopics) {
    logWarning('Manager meeting topics may not be performance-focused');
  } else {
    logSuccess('Manager meeting has performance-related topics');
  }
  
  // Test responding to manager meeting
  logInfo('Responding to manager meeting topics...');
  const topic = meeting.topics[0];
  const responseText = 'Thank you for the opportunity to discuss my performance. I\'ve been focused on delivering high-quality work and meeting all project deadlines. I\'ve successfully completed several key initiatives this quarter, including leading the mobile app redesign and mentoring two junior developers. I\'m proud of the positive feedback from stakeholders and the measurable improvements in app performance. Moving forward, I\'m excited to take on more leadership responsibilities and continue growing my technical skills.';
  
  const response = await testRespondToTopic(sessionId, meeting.id, topic, responseText);
  if (!response) {
    logError('Failed to respond to manager meeting');
    return false;
  }
  
  logSuccess('Successfully responded to manager meeting');
  
  // Verify manager provides feedback
  const managerResponse = response.ai_responses.find(r => 
    r.participant_name.toLowerCase().includes('manager') ||
    meeting.participants.find(p => p.name === r.participant_name)?.role.toLowerCase().includes('manager')
  );
  
  if (!managerResponse) {
    logWarning('No response from manager participant');
  } else {
    logSuccess('Manager provided feedback');
    log(`Manager feedback: ${managerResponse.response}`, 'cyan');
  }
  
  logSuccess('Manager meeting request test PASSED');
  return true;
}

async function testMeetingPerformanceImpact(sessionId) {
  logSection('TEST: Meeting Performance Impact (Requirements 25.5, 25.6)');
  
  // Get initial player state
  const initialState = await makeRequest(`/sessions/${sessionId}/state`, 'GET');
  const initialXP = initialState.xp;
  const initialLevel = initialState.level;
  
  logInfo(`Initial state: Level ${initialLevel}, XP ${initialXP}`);
  
  // Generate and complete a meeting with good responses
  const meeting = await testGenerateMeeting(sessionId, 'project_update');
  if (!meeting) {
    logError('Failed to generate meeting');
    return false;
  }
  
  // Respond to all topics with high-quality responses
  for (const topic of meeting.topics) {
    const responseText = `I appreciate the opportunity to discuss this. Based on my analysis and experience, I recommend we focus on ${topic.expected_points?.[0] || 'the strategic priorities'}. I've prepared a detailed plan that addresses ${topic.expected_points?.[1] || 'all key requirements'}. The approach I'm proposing has been validated through ${topic.expected_points?.[2] || 'thorough research and stakeholder input'}. I'm confident this will deliver excellent results and I'm committed to ensuring successful execution. I welcome any questions or feedback.`;
    
    await testRespondToTopic(sessionId, meeting.id, topic, responseText);
  }
  
  // Complete the meeting
  const completion = await makeRequest(
    `/sessions/${sessionId}/meetings/${meeting.id}/complete`,
    'POST'
  );
  
  // Verify XP was awarded
  const finalState = await makeRequest(`/sessions/${sessionId}/state`, 'GET');
  const xpGained = finalState.xp - initialXP;
  
  if (xpGained <= 0) {
    logError('No XP gained from meeting');
    return false;
  }
  logSuccess(`XP gained from meeting: ${xpGained}`);
  
  // Verify meeting performance is tracked
  if (!finalState.meeting_history || finalState.meeting_history.length === 0) {
    logWarning('Meeting history not tracked in player state');
  } else {
    logSuccess('Meeting performance tracked in player state');
    const lastMeeting = finalState.meeting_history[finalState.meeting_history.length - 1];
    log(`Last meeting: ${lastMeeting.meeting_type}, Score: ${lastMeeting.score}, XP: ${lastMeeting.xp_gained}`, 'cyan');
  }
  
  logSuccess('Meeting performance impact test PASSED');
  return true;
}

async function runAllTests() {
  logSection('MEETING SYSTEM TEST SUITE');
  log('Testing Requirements: 24.1, 24.2, 24.3, 24.4, 24.5, 24.6, 24.7, 25.1, 25.2, 25.3, 25.5, 25.6', 'cyan');
  
  const results = {
    meetingFlow: false,
    meetingTypes: false,
    aiResponses: false,
    managerMeeting: false,
    performanceImpact: false,
  };
  
  try {
    // Create session and accept job
    const sessionId = await createSession();
    await acceptJob(sessionId);
    
    // Run all tests
    results.meetingFlow = await testMeetingFlow(sessionId);
    results.meetingTypes = await testDifferentMeetingTypes(sessionId);
    results.aiResponses = await testAIColleagueResponses(sessionId);
    results.managerMeeting = await testManagerMeetingRequest(sessionId);
    results.performanceImpact = await testMeetingPerformanceImpact(sessionId);
    
    // Summary
    logSection('TEST SUMMARY');
    
    const tests = [
      { name: 'Complete Meeting Flow (24.4, 24.5, 24.6)', passed: results.meetingFlow },
      { name: 'Different Meeting Types (24.2)', passed: results.meetingTypes },
      { name: 'AI Colleague Responses (24.7)', passed: results.aiResponses },
      { name: 'Manager Meeting Request (25.1, 25.2, 25.3)', passed: results.managerMeeting },
      { name: 'Performance Impact (25.5, 25.6)', passed: results.performanceImpact },
    ];
    
    tests.forEach(test => {
      if (test.passed) {
        logSuccess(`${test.name}: PASSED`);
      } else {
        logError(`${test.name}: FAILED`);
      }
    });
    
    const passedCount = tests.filter(t => t.passed).length;
    const totalCount = tests.length;
    
    console.log('\n' + '='.repeat(80));
    if (passedCount === totalCount) {
      logSuccess(`ALL TESTS PASSED (${passedCount}/${totalCount})`);
      log('\n✓ Task 9.4 Complete: Meeting system tested successfully', 'green');
      process.exit(0);
    } else {
      logError(`SOME TESTS FAILED (${passedCount}/${totalCount} passed)`);
      log('\n✗ Task 9.4 Incomplete: Some meeting tests failed', 'red');
      process.exit(1);
    }
    
  } catch (error) {
    logError(`Test suite failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// Run tests
runAllTests();
