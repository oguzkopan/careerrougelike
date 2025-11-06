#!/usr/bin/env node

/**
 * Test Script for Diverse Task Types
 * 
 * This script tests all 5 diverse task types:
 * 1. Multiple Choice
 * 2. Fill in the Blank
 * 3. Matching
 * 4. Code Review
 * 5. Prioritization
 * 
 * Requirements tested: 23.1, 23.2, 23.3, 23.4, 23.5
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
  const data = await response.json();

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${JSON.stringify(data)}`);
  }

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
  interview.questions.forEach((q, index) => {
    // Use expected answer if available, otherwise provide a comprehensive answer
    answers[q.id] = q.expected_answer || `I have over 5 years of extensive experience with this technology and have successfully implemented similar solutions in multiple production projects. I deeply understand the core concepts, architectural patterns, and industry best practices. I have led teams in implementing these solutions and have mentored junior developers. I stay current with the latest developments and continuously improve my skills through hands-on projects and professional development. I can provide specific examples of how I've applied these concepts to solve real-world business problems, including performance optimization, scalability improvements, and user experience enhancements. I'm confident in my ability to contribute immediately and add significant value to your team.`;
  });
  
  const result = await makeRequest(
    `/sessions/${sessionId}/jobs/${job.id}/interview/submit`,
    'POST',
    { answers }
  );
  
  if (!result.passed) {
    throw new Error('Failed interview - cannot proceed with task testing');
  }
  
  logSuccess(`Interview passed with score: ${result.overall_score}/100`);
  
  // Accept job offer
  logInfo('Accepting job offer...');
  await makeRequest(`/sessions/${sessionId}/jobs/${job.id}/accept`, 'POST');
  logSuccess('Job accepted - ready to test tasks');
  
  return job;
}

async function getTasks(sessionId) {
  const response = await makeRequest(`/sessions/${sessionId}/tasks`, 'GET');
  return response.tasks || [];
}

async function generateTaskUntilType(sessionId, targetType, maxAttempts = 20) {
  logInfo(`Attempting to generate ${targetType} task...`);
  
  for (let i = 0; i < maxAttempts; i++) {
    // Generate a new task by submitting a dummy solution to an existing task
    const tasks = await getTasks(sessionId);
    
    if (tasks.length === 0) {
      throw new Error('No tasks available');
    }
    
    // Check if we already have the target type
    const existingTask = tasks.find(t => t.format_type === targetType);
    if (existingTask) {
      logSuccess(`Found existing ${targetType} task: ${existingTask.title}`);
      return existingTask;
    }
    
    // Submit a task to trigger generation of a new one
    const taskToSubmit = tasks.find(t => t.status === 'pending');
    if (taskToSubmit) {
      try {
        await makeRequest(
          `/sessions/${sessionId}/tasks/${taskToSubmit.id}/submit`,
          'POST',
          { solution: 'Test solution to generate new task' }
        );
      } catch (error) {
        // Ignore grading errors, we just want to trigger new task generation
      }
    }
    
    // Wait a bit for task generation
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  logWarning(`Could not generate ${targetType} task after ${maxAttempts} attempts`);
  return null;
}

async function testMultipleChoiceTask(sessionId) {
  logSection('TEST 1: Multiple Choice Task (Requirement 23.1)');
  
  const task = await generateTaskUntilType(sessionId, 'multiple_choice');
  
  if (!task) {
    logError('Could not find or generate multiple choice task');
    return false;
  }
  
  logInfo(`Task: ${task.title}`);
  logInfo(`Description: ${task.description}`);
  
  // Verify task structure
  if (!task.options || task.options.length !== 4) {
    logError(`Expected 4 options, got ${task.options?.length || 0}`);
    return false;
  }
  logSuccess('Task has 4 options');
  
  if (!task.correct_answer) {
    logError('Task missing correct_answer field');
    return false;
  }
  logSuccess(`Correct answer is: ${task.correct_answer}`);
  
  // Display options
  log('\nOptions:', 'cyan');
  task.options.forEach(opt => {
    log(`  ${opt.id}. ${opt.text}`, 'reset');
  });
  
  // Test with correct answer
  logInfo('\nSubmitting CORRECT answer...');
  const correctResult = await makeRequest(
    `/sessions/${sessionId}/tasks/${task.id}/submit`,
    'POST',
    { solution: task.correct_answer }
  );
  
  if (correctResult.score === 100 && correctResult.passed) {
    logSuccess(`Correct answer scored 100/100 and passed`);
  } else {
    logError(`Correct answer scored ${correctResult.score}/100 (expected 100)`);
    return false;
  }
  
  // Generate another multiple choice task to test wrong answer
  const task2 = await generateTaskUntilType(sessionId, 'multiple_choice');
  if (task2) {
    logInfo('\nSubmitting WRONG answer...');
    const wrongAnswer = task2.options.find(opt => opt.id !== task2.correct_answer)?.id || 'A';
    const wrongResult = await makeRequest(
      `/sessions/${sessionId}/tasks/${task2.id}/submit`,
      'POST',
      { solution: wrongAnswer }
    );
    
    if (wrongResult.score === 0 && !wrongResult.passed) {
      logSuccess(`Wrong answer scored 0/100 and failed`);
    } else {
      logError(`Wrong answer scored ${wrongResult.score}/100 (expected 0)`);
      return false;
    }
  }
  
  logSuccess('Multiple choice task test PASSED');
  return true;
}

async function testFillInBlankTask(sessionId) {
  logSection('TEST 2: Fill in the Blank Task (Requirement 23.2)');
  
  const task = await generateTaskUntilType(sessionId, 'fill_in_blank');
  
  if (!task) {
    logError('Could not find or generate fill in blank task');
    return false;
  }
  
  logInfo(`Task: ${task.title}`);
  logInfo(`Description: ${task.description}`);
  
  // Verify task structure
  if (!task.blanks || task.blanks.length < 3 || task.blanks.length > 5) {
    logError(`Expected 3-5 blanks, got ${task.blanks?.length || 0}`);
    return false;
  }
  logSuccess(`Task has ${task.blanks.length} blanks`);
  
  if (!task.blank_text) {
    logError('Task missing blank_text field');
    return false;
  }
  logSuccess('Task has blank_text with placeholders');
  
  if (!task.expected_answers) {
    logError('Task missing expected_answers field');
    return false;
  }
  
  // Display the text with blanks
  log('\nText with blanks:', 'cyan');
  log(task.blank_text, 'reset');
  
  log('\nBlanks to fill:', 'cyan');
  task.blanks.forEach(blank => {
    log(`  ${blank.id}: ${blank.placeholder}`, 'reset');
  });
  
  // Test with correct answers
  logInfo('\nSubmitting CORRECT answers...');
  const correctAnswers = {};
  task.blanks.forEach(blank => {
    correctAnswers[blank.id] = task.expected_answers[blank.id];
  });
  
  const correctResult = await makeRequest(
    `/sessions/${sessionId}/tasks/${task.id}/submit`,
    'POST',
    { solution: JSON.stringify(correctAnswers) }
  );
  
  if (correctResult.score >= 70 && correctResult.passed) {
    logSuccess(`Correct answers scored ${correctResult.score}/100 and passed`);
  } else {
    logError(`Correct answers scored ${correctResult.score}/100 (expected >= 70)`);
    return false;
  }
  
  // Generate another fill in blank task to test partial answers
  const task2 = await generateTaskUntilType(sessionId, 'fill_in_blank');
  if (task2) {
    logInfo('\nSubmitting PARTIAL answers (50% correct)...');
    const partialAnswers = {};
    const blanksToFill = Math.floor(task2.blanks.length / 2);
    task2.blanks.forEach((blank, index) => {
      if (index < blanksToFill) {
        partialAnswers[blank.id] = task2.expected_answers[blank.id];
      } else {
        partialAnswers[blank.id] = 'wrong answer';
      }
    });
    
    const partialResult = await makeRequest(
      `/sessions/${sessionId}/tasks/${task2.id}/submit`,
      'POST',
      { solution: JSON.stringify(partialAnswers) }
    );
    
    logInfo(`Partial answers scored ${partialResult.score}/100`);
    if (partialResult.score > 0 && partialResult.score < 100) {
      logSuccess('Partial credit awarded correctly');
    }
  }
  
  logSuccess('Fill in blank task test PASSED');
  return true;
}

async function testMatchingTask(sessionId) {
  logSection('TEST 3: Matching Task (Requirement 23.3)');
  
  const task = await generateTaskUntilType(sessionId, 'matching');
  
  if (!task) {
    logError('Could not find or generate matching task');
    return false;
  }
  
  logInfo(`Task: ${task.title}`);
  logInfo(`Description: ${task.description}`);
  
  // Verify task structure
  if (!task.matching_left || task.matching_left.length < 5 || task.matching_left.length > 7) {
    logError(`Expected 5-7 items to match, got ${task.matching_left?.length || 0}`);
    return false;
  }
  logSuccess(`Task has ${task.matching_left.length} items to match`);
  
  if (!task.matching_right || task.matching_right.length < 5) {
    logError(`Expected matching_right items, got ${task.matching_right?.length || 0}`);
    return false;
  }
  logSuccess(`Task has ${task.matching_right.length} matching options`);
  
  if (!task.correct_matches) {
    logError('Task missing correct_matches field');
    return false;
  }
  
  // Display matching items
  log('\nItems to match:', 'cyan');
  task.matching_left.forEach(item => {
    log(`  ${item.id}: ${item.text}`, 'reset');
  });
  
  log('\nAvailable matches:', 'cyan');
  task.matching_right.forEach(item => {
    log(`  ${item.id}: ${item.text}`, 'reset');
  });
  
  // Test with correct matches
  logInfo('\nSubmitting CORRECT matches...');
  const correctResult = await makeRequest(
    `/sessions/${sessionId}/tasks/${task.id}/submit`,
    'POST',
    { solution: JSON.stringify(task.correct_matches) }
  );
  
  if (correctResult.score >= 70 && correctResult.passed) {
    logSuccess(`Correct matches scored ${correctResult.score}/100 and passed`);
  } else {
    logError(`Correct matches scored ${correctResult.score}/100 (expected >= 70)`);
    return false;
  }
  
  // Generate another matching task to test wrong matches
  const task2 = await generateTaskUntilType(sessionId, 'matching');
  if (task2) {
    logInfo('\nSubmitting WRONG matches...');
    const wrongMatches = {};
    const leftIds = task2.matching_left.map(item => item.id);
    const rightIds = task2.matching_right.map(item => item.id);
    
    // Create intentionally wrong matches
    leftIds.forEach((leftId, index) => {
      const wrongRightId = rightIds[(index + 1) % rightIds.length];
      wrongMatches[leftId] = wrongRightId;
    });
    
    const wrongResult = await makeRequest(
      `/sessions/${sessionId}/tasks/${task2.id}/submit`,
      'POST',
      { solution: JSON.stringify(wrongMatches) }
    );
    
    if (wrongResult.score < 70 && !wrongResult.passed) {
      logSuccess(`Wrong matches scored ${wrongResult.score}/100 and failed`);
    } else {
      logWarning(`Wrong matches scored ${wrongResult.score}/100 (expected < 70)`);
    }
  }
  
  logSuccess('Matching task test PASSED');
  return true;
}

async function testCodeReviewTask(sessionId) {
  logSection('TEST 4: Code Review Task (Requirement 23.4)');
  
  const task = await generateTaskUntilType(sessionId, 'code_review');
  
  if (!task) {
    logError('Could not find or generate code review task');
    return false;
  }
  
  logInfo(`Task: ${task.title}`);
  logInfo(`Description: ${task.description}`);
  
  // Verify task structure
  if (!task.code) {
    logError('Task missing code field');
    return false;
  }
  logSuccess('Task has code snippet');
  
  if (!task.bugs || task.bugs.length < 2 || task.bugs.length > 4) {
    logError(`Expected 2-4 bugs, got ${task.bugs?.length || 0}`);
    return false;
  }
  logSuccess(`Task has ${task.bugs.length} bugs to identify`);
  
  // Display code
  log('\nCode to review:', 'cyan');
  const codeLines = task.code.split('\n');
  codeLines.forEach((line, index) => {
    log(`${String(index + 1).padStart(3, ' ')} | ${line}`, 'reset');
  });
  
  log('\nExpected bugs:', 'cyan');
  task.bugs.forEach(bug => {
    log(`  Line ${bug.line_number}: ${bug.description}`, 'reset');
  });
  
  // Test with correct bug identification
  logInfo('\nSubmitting CORRECT bug identification...');
  let bugReport = '';
  task.bugs.forEach(bug => {
    bugReport += `Line ${bug.line_number}: ${bug.description}\n`;
  });
  
  const correctResult = await makeRequest(
    `/sessions/${sessionId}/tasks/${task.id}/submit`,
    'POST',
    { solution: bugReport.trim() }
  );
  
  if (correctResult.score >= 70 && correctResult.passed) {
    logSuccess(`Correct bug identification scored ${correctResult.score}/100 and passed`);
  } else {
    logError(`Correct bug identification scored ${correctResult.score}/100 (expected >= 70)`);
    return false;
  }
  
  // Generate another code review task to test partial identification
  const task2 = await generateTaskUntilType(sessionId, 'code_review');
  if (task2) {
    logInfo('\nSubmitting PARTIAL bug identification (50% of bugs)...');
    const halfBugs = task2.bugs.slice(0, Math.ceil(task2.bugs.length / 2));
    let partialReport = '';
    halfBugs.forEach(bug => {
      partialReport += `Line ${bug.line_number}: ${bug.description}\n`;
    });
    
    const partialResult = await makeRequest(
      `/sessions/${sessionId}/tasks/${task2.id}/submit`,
      'POST',
      { solution: partialReport.trim() }
    );
    
    logInfo(`Partial bug identification scored ${partialResult.score}/100`);
    if (partialResult.score > 0 && partialResult.score < 100) {
      logSuccess('Partial credit awarded correctly');
    }
  }
  
  logSuccess('Code review task test PASSED');
  return true;
}

async function testPrioritizationTask(sessionId) {
  logSection('TEST 5: Prioritization Task (Requirement 23.5)');
  
  const task = await generateTaskUntilType(sessionId, 'prioritization');
  
  if (!task) {
    logError('Could not find or generate prioritization task');
    return false;
  }
  
  logInfo(`Task: ${task.title}`);
  logInfo(`Description: ${task.description}`);
  
  // Verify task structure
  if (!task.prioritization_items || task.prioritization_items.length < 5 || task.prioritization_items.length > 8) {
    logError(`Expected 5-8 items to prioritize, got ${task.prioritization_items?.length || 0}`);
    return false;
  }
  logSuccess(`Task has ${task.prioritization_items.length} items to prioritize`);
  
  if (!task.correct_priority) {
    logError('Task missing correct_priority field');
    return false;
  }
  logSuccess('Task has correct priority order');
  
  // Display items
  log('\nItems to prioritize:', 'cyan');
  task.prioritization_items.forEach((item, index) => {
    log(`  ${index + 1}. ${item.text}`, 'reset');
  });
  
  log('\nCorrect priority order:', 'cyan');
  task.correct_priority.forEach((itemId, index) => {
    const item = task.prioritization_items.find(i => i.id === itemId);
    log(`  ${index + 1}. ${item?.text || itemId}`, 'reset');
  });
  
  // Test with correct priority
  logInfo('\nSubmitting CORRECT priority order...');
  const correctResult = await makeRequest(
    `/sessions/${sessionId}/tasks/${task.id}/submit`,
    'POST',
    { solution: JSON.stringify(task.correct_priority) }
  );
  
  if (correctResult.score >= 70 && correctResult.passed) {
    logSuccess(`Correct priority scored ${correctResult.score}/100 and passed`);
  } else {
    logError(`Correct priority scored ${correctResult.score}/100 (expected >= 70)`);
    return false;
  }
  
  // Generate another prioritization task to test wrong order
  const task2 = await generateTaskUntilType(sessionId, 'prioritization');
  if (task2) {
    logInfo('\nSubmitting REVERSED priority order...');
    const reversedPriority = [...task2.correct_priority].reverse();
    
    const wrongResult = await makeRequest(
      `/sessions/${sessionId}/tasks/${task2.id}/submit`,
      'POST',
      { solution: JSON.stringify(reversedPriority) }
    );
    
    if (wrongResult.score < 70 && !wrongResult.passed) {
      logSuccess(`Reversed priority scored ${wrongResult.score}/100 and failed`);
    } else {
      logWarning(`Reversed priority scored ${wrongResult.score}/100 (expected < 70)`);
    }
  }
  
  logSuccess('Prioritization task test PASSED');
  return true;
}

async function runAllTests() {
  logSection('DIVERSE TASK TYPES TEST SUITE');
  log('Testing Requirements: 23.1, 23.2, 23.3, 23.4, 23.5', 'cyan');
  
  const results = {
    multipleChoice: false,
    fillInBlank: false,
    matching: false,
    codeReview: false,
    prioritization: false,
  };
  
  try {
    // Create session and accept job
    const sessionId = await createSession();
    await acceptJob(sessionId);
    
    // Run all tests
    results.multipleChoice = await testMultipleChoiceTask(sessionId);
    results.fillInBlank = await testFillInBlankTask(sessionId);
    results.matching = await testMatchingTask(sessionId);
    results.codeReview = await testCodeReviewTask(sessionId);
    results.prioritization = await testPrioritizationTask(sessionId);
    
    // Summary
    logSection('TEST SUMMARY');
    
    const tests = [
      { name: 'Multiple Choice (23.1)', passed: results.multipleChoice },
      { name: 'Fill in Blank (23.2)', passed: results.fillInBlank },
      { name: 'Matching (23.3)', passed: results.matching },
      { name: 'Code Review (23.4)', passed: results.codeReview },
      { name: 'Prioritization (23.5)', passed: results.prioritization },
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
      log('\n✓ Task 9.3 Complete: All diverse task types tested successfully', 'green');
      process.exit(0);
    } else {
      logError(`SOME TESTS FAILED (${passedCount}/${totalCount} passed)`);
      log('\n✗ Task 9.3 Incomplete: Some task types failed testing', 'red');
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
