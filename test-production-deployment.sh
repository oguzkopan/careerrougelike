#!/bin/bash

# Production Deployment E2E Test Script
# Tests all critical features in the deployed application

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
BACKEND_URL="https://career-rl-backend-qy7qschhma-ew.a.run.app"
FRONTEND_URL="https://career-rl-frontend-qy7qschhma-ew.a.run.app"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Production Deployment E2E Test${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Test counters
TESTS_PASSED=0
TESTS_FAILED=0

# Helper function to test endpoint
test_endpoint() {
    local name=$1
    local method=$2
    local url=$3
    local data=$4
    local expected_status=$5
    
    echo -e "${YELLOW}Testing: ${name}${NC}"
    
    if [ -z "$data" ]; then
        response=$(curl -s -w "\n%{http_code}" -X ${method} "${url}")
    else
        response=$(curl -s -w "\n%{http_code}" -X ${method} "${url}" \
            -H "Content-Type: application/json" \
            -d "${data}")
    fi
    
    status_code=$(echo "$response" | tail -n 1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$status_code" = "$expected_status" ]; then
        echo -e "${GREEN}✓ PASSED${NC} (Status: ${status_code})"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        echo "$body"
        return 0
    else
        echo -e "${RED}✗ FAILED${NC} (Expected: ${expected_status}, Got: ${status_code})"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        echo "$body"
        return 1
    fi
}

echo -e "${BLUE}[1/8] Testing Backend Health${NC}"
test_endpoint "Backend Health Check" "GET" "${BACKEND_URL}/health" "" "200"
echo ""

echo -e "${BLUE}[2/8] Testing Frontend Health${NC}"
frontend_response=$(curl -s -w "\n%{http_code}" "${FRONTEND_URL}")
frontend_status=$(echo "$frontend_response" | tail -n 1)
if [ "$frontend_status" = "200" ]; then
    echo -e "${GREEN}✓ Frontend is accessible${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}✗ Frontend is not accessible (Status: ${frontend_status})${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi
echo ""

echo -e "${BLUE}[3/8] Testing Session Creation${NC}"
session_response=$(curl -s -X POST "${BACKEND_URL}/sessions" \
    -H "Content-Type: application/json" \
    -d '{"profession":"ios_engineer","level":3}')
SESSION_ID=$(echo "$session_response" | grep -o '"session_id":"[^"]*"' | cut -d'"' -f4)

if [ -n "$SESSION_ID" ]; then
    echo -e "${GREEN}✓ Session created: ${SESSION_ID}${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}✗ Failed to create session${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
    echo "$session_response"
fi
echo ""

if [ -n "$SESSION_ID" ]; then
    echo -e "${BLUE}[4/8] Testing Job Generation${NC}"
    jobs_response=$(curl -s -X POST "${BACKEND_URL}/sessions/${SESSION_ID}/jobs/generate" \
        -H "Content-Type: application/json" \
        -d '{"player_level":3,"count":5}')
    
    job_count=$(echo "$jobs_response" | grep -o '"job_id"' | wc -l)
    if [ "$job_count" -gt 0 ]; then
        echo -e "${GREEN}✓ Generated ${job_count} jobs${NC}"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        JOB_ID=$(echo "$jobs_response" | grep -o '"job_id":"[^"]*"' | head -1 | cut -d'"' -f4)
        echo "First job ID: ${JOB_ID}"
    else
        echo -e "${RED}✗ No jobs generated${NC}"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
    echo ""
    
    if [ -n "$JOB_ID" ]; then
        echo -e "${BLUE}[5/8] Testing Interview Generation${NC}"
        interview_response=$(curl -s -X POST "${BACKEND_URL}/sessions/${SESSION_ID}/jobs/${JOB_ID}/interview")
        
        question_count=$(echo "$interview_response" | grep -o '"question"' | wc -l)
        if [ "$question_count" -gt 0 ]; then
            echo -e "${GREEN}✓ Generated ${question_count} interview questions${NC}"
            TESTS_PASSED=$((TESTS_PASSED + 1))
        else
            echo -e "${RED}✗ No interview questions generated${NC}"
            TESTS_FAILED=$((TESTS_FAILED + 1))
        fi
        echo ""
        
        echo -e "${BLUE}[6/8] Testing Interview Grading (Fail Case)${NC}"
        grading_response=$(curl -s -X POST "${BACKEND_URL}/sessions/${SESSION_ID}/jobs/${JOB_ID}/interview/submit" \
            -H "Content-Type: application/json" \
            -d '{"answers":{"0":"gibberish","1":"nonsense","2":"random text"}}')
        
        passed=$(echo "$grading_response" | grep -o '"passed":[^,}]*' | cut -d':' -f2)
        if [ "$passed" = "false" ]; then
            echo -e "${GREEN}✓ Grading correctly failed gibberish answers${NC}"
            TESTS_PASSED=$((TESTS_PASSED + 1))
        else
            echo -e "${RED}✗ Grading incorrectly passed gibberish answers${NC}"
            TESTS_FAILED=$((TESTS_FAILED + 1))
        fi
        echo ""
        
        echo -e "${BLUE}[7/8] Testing Task Generation${NC}"
        # First, let's try to get a good interview result by providing better answers
        good_interview_response=$(curl -s -X POST "${BACKEND_URL}/sessions/${SESSION_ID}/jobs/${JOB_ID}/interview")
        
        # Submit good answers
        good_grading=$(curl -s -X POST "${BACKEND_URL}/sessions/${SESSION_ID}/jobs/${JOB_ID}/interview/submit" \
            -H "Content-Type: application/json" \
            -d '{"answers":{"0":"I have extensive experience with Swift and iOS development, including UIKit and SwiftUI frameworks. I have built multiple production apps.","1":"I use MVVM architecture pattern with Combine for reactive programming. I ensure proper separation of concerns and testability.","2":"I am passionate about creating great user experiences and staying up to date with the latest iOS technologies and best practices."}}')
        
        passed=$(echo "$good_grading" | grep -o '"passed":[^,}]*' | cut -d':' -f2)
        if [ "$passed" = "true" ]; then
            echo -e "${GREEN}✓ Interview passed with good answers${NC}"
            
            # Accept the job offer
            accept_response=$(curl -s -X POST "${BACKEND_URL}/sessions/${SESSION_ID}/jobs/${JOB_ID}/accept")
            
            # Get tasks
            tasks_response=$(curl -s -X GET "${BACKEND_URL}/sessions/${SESSION_ID}/tasks")
            task_count=$(echo "$tasks_response" | grep -o '"task_id"' | wc -l)
            
            if [ "$task_count" -gt 0 ]; then
                echo -e "${GREEN}✓ Generated ${task_count} tasks after job acceptance${NC}"
                TESTS_PASSED=$((TESTS_PASSED + 1))
            else
                echo -e "${RED}✗ No tasks generated${NC}"
                TESTS_FAILED=$((TESTS_FAILED + 1))
            fi
        else
            echo -e "${YELLOW}⚠ Could not test task generation (interview not passed)${NC}"
        fi
        echo ""
    fi
    
    echo -e "${BLUE}[8/8] Testing Voice Input Endpoint${NC}"
    # Test that the voice endpoint exists (will return error without audio, but should not 404)
    voice_response=$(curl -s -w "\n%{http_code}" -X POST "${BACKEND_URL}/sessions/${SESSION_ID}/interview/voice")
    voice_status=$(echo "$voice_response" | tail -n 1)
    
    if [ "$voice_status" != "404" ]; then
        echo -e "${GREEN}✓ Voice input endpoint exists${NC}"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "${RED}✗ Voice input endpoint not found${NC}"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
    echo ""
fi

# Summary
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Test Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}Passed: ${TESTS_PASSED}${NC}"
echo -e "${RED}Failed: ${TESTS_FAILED}${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
    echo ""
    echo -e "${BLUE}Deployment URLs:${NC}"
    echo -e "Backend:  ${YELLOW}${BACKEND_URL}${NC}"
    echo -e "Frontend: ${YELLOW}${FRONTEND_URL}${NC}"
    echo ""
    echo -e "${GREEN}✓ Production deployment verified successfully!${NC}"
    exit 0
else
    echo -e "${RED}✗ Some tests failed. Please review the output above.${NC}"
    exit 1
fi
