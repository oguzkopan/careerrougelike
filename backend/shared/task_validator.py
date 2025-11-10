"""
Task Validator

This module provides validation and repair functionality for task data,
ensuring all task format types meet structural requirements before storage.
"""

import logging
from typing import Dict, Any, List, Optional
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class ValidationResult:
    """Result of task validation."""
    is_valid: bool
    errors: List[str]
    warnings: List[str]
    repaired: bool = False


class TaskValidator:
    """
    Validates and repairs task data for all format types.
    
    Ensures tasks meet structural requirements before storage in Firestore.
    Provides repair logic for partially complete tasks.
    """
    
    def __init__(self):
        """Initialize the task validator."""
        self.format_validators = {
            'text_answer': self._validate_text_answer,
            'multiple_choice': self._validate_multiple_choice,
            'fill_in_blank': self._validate_fill_in_blank,
            'code_review': self._validate_code_review,
            'prioritization': self._validate_prioritization
        }
    
    def validate_task(self, task_data: Dict[str, Any], format_type: str) -> ValidationResult:
        """
        Main validation entry point.
        
        Args:
            task_data: Task data dictionary to validate
            format_type: Expected format type of the task
            
        Returns:
            ValidationResult with validation status and any errors/warnings
        """
        errors = []
        warnings = []
        
        # Validate common required fields
        if not task_data.get('id'):
            errors.append("Missing required field: 'id'")
        
        if not task_data.get('title'):
            errors.append("Missing required field: 'title'")
        
        if not task_data.get('description'):
            errors.append("Missing required field: 'description'")
        
        if not task_data.get('format_type'):
            errors.append("Missing required field: 'format_type'")
        elif task_data['format_type'] != format_type:
            errors.append(f"Format type mismatch: expected '{format_type}', got '{task_data['format_type']}'")
        
        if not isinstance(task_data.get('difficulty'), (int, float)):
            warnings.append("Missing or invalid 'difficulty' field")
        
        if not isinstance(task_data.get('xp_reward'), (int, float)):
            warnings.append("Missing or invalid 'xp_reward' field")
        
        # Validate format-specific fields
        validator = self.format_validators.get(format_type)
        if validator:
            format_errors = validator(task_data)
            errors.extend(format_errors)
        else:
            warnings.append(f"Unknown format type: '{format_type}', skipping format-specific validation")
        
        is_valid = len(errors) == 0
        
        if not is_valid:
            self.log_validation_failure(task_data, errors)
        
        return ValidationResult(
            is_valid=is_valid,
            errors=errors,
            warnings=warnings,
            repaired=False
        )
    
    def _validate_text_answer(self, task_data: Dict[str, Any]) -> List[str]:
        """Validate text_answer format task."""
        errors = []
        
        if not task_data.get('requirements'):
            errors.append("Missing 'requirements' field for text_answer task")
        elif not isinstance(task_data['requirements'], list):
            errors.append("'requirements' must be a list")
        
        if not task_data.get('acceptance_criteria'):
            errors.append("Missing 'acceptance_criteria' field for text_answer task")
        elif not isinstance(task_data['acceptance_criteria'], list):
            errors.append("'acceptance_criteria' must be a list")
        
        return errors
    
    def _validate_multiple_choice(self, task_data: Dict[str, Any]) -> List[str]:
        """Validate multiple_choice format task."""
        errors = []
        
        options = task_data.get('options', [])
        if not options:
            errors.append("Missing 'options' field for multiple_choice task")
        elif not isinstance(options, list):
            errors.append("'options' must be a list")
        elif len(options) < 4:
            errors.append(f"multiple_choice task must have at least 4 options, got {len(options)}")
        else:
            # Validate each option has id and text
            for i, option in enumerate(options):
                if not isinstance(option, dict):
                    errors.append(f"Option {i} must be a dictionary")
                    continue
                if not option.get('id'):
                    errors.append(f"Option {i} missing 'id' field")
                if not option.get('text'):
                    errors.append(f"Option {i} missing 'text' field")
        
        if not task_data.get('correct_answer'):
            errors.append("Missing 'correct_answer' field for multiple_choice task")
        
        return errors


    def _validate_fill_in_blank(self, task_data: Dict[str, Any]) -> List[str]:
        """Validate fill_in_blank format task."""
        errors = []
        
        blank_text = task_data.get('blank_text', '')
        blanks = task_data.get('blanks', [])
        expected_answers = task_data.get('expected_answers', {})
        
        if not blank_text:
            errors.append("Missing 'blank_text' field for fill_in_blank task")
        
        if not blanks:
            errors.append("Missing 'blanks' field for fill_in_blank task")
        elif not isinstance(blanks, list):
            errors.append("'blanks' must be a list")
        elif len(blanks) < 3:
            errors.append(f"fill_in_blank task must have at least 3 blanks, got {len(blanks)}")
        else:
            # Validate each blank has id
            for i, blank in enumerate(blanks):
                if not isinstance(blank, dict):
                    errors.append(f"blank {i} must be a dictionary")
                    continue
                if not blank.get('id'):
                    errors.append(f"blank {i} missing 'id' field")
        
        if not expected_answers:
            errors.append("Missing 'expected_answers' field for fill_in_blank task")
        elif not isinstance(expected_answers, dict):
            errors.append("'expected_answers' must be a dictionary")
        elif len(expected_answers) < 3:
            errors.append(f"expected_answers must have at least 3 entries, got {len(expected_answers)}")
        
        return errors
    
    def _validate_code_review(self, task_data: Dict[str, Any]) -> List[str]:
        """Validate code_review format task."""
        errors = []
        
        code = task_data.get('code', '')
        bugs = task_data.get('bugs', [])
        
        if not code:
            errors.append("Missing 'code' field for code_review task")
        
        if not bugs:
            errors.append("Missing 'bugs' field for code_review task")
        elif not isinstance(bugs, list):
            errors.append("'bugs' must be a list")
        elif len(bugs) < 2:
            errors.append(f"code_review task must have at least 2 bugs, got {len(bugs)}")
        else:
            # Validate each bug has required fields
            for i, bug in enumerate(bugs):
                if not isinstance(bug, dict):
                    errors.append(f"bug {i} must be a dictionary")
                    continue
                if 'line_number' not in bug:
                    errors.append(f"bug {i} missing 'line_number' field")
                if not bug.get('description'):
                    errors.append(f"bug {i} missing 'description' field")
        
        return errors
    
    def _validate_prioritization(self, task_data: Dict[str, Any]) -> List[str]:
        """Validate prioritization format task."""
        errors = []
        
        items = task_data.get('prioritization_items', [])
        correct_priority = task_data.get('correct_priority', [])
        
        if not items:
            errors.append("Missing 'prioritization_items' field for prioritization task")
        elif not isinstance(items, list):
            errors.append("'prioritization_items' must be a list")
        elif len(items) < 5:
            errors.append(f"prioritization task must have at least 5 items, got {len(items)}")
        else:
            # Validate each item has id and text
            for i, item in enumerate(items):
                if not isinstance(item, dict):
                    errors.append(f"prioritization_items item {i} must be a dictionary")
                    continue
                if not item.get('id'):
                    errors.append(f"prioritization_items item {i} missing 'id' field")
                if not item.get('text'):
                    errors.append(f"prioritization_items item {i} missing 'text' field")
        
        if not correct_priority:
            errors.append("Missing 'correct_priority' field for prioritization task")
        elif not isinstance(correct_priority, list):
            errors.append("'correct_priority' must be a list")
        elif len(correct_priority) < 5:
            errors.append(f"correct_priority must have at least 5 items, got {len(correct_priority)}")
        
        return errors
    
    def repair_matching_task(self, task_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Attempt to repair a partially complete matching task.
        
        Repair strategies:
        - If 3-4 items exist, add placeholder items to reach 5
        - If items exist but missing id/text, generate them
        - If correct_matches is incomplete, generate missing mappings
        
        Args:
            task_data: Partially complete matching task data
            
        Returns:
            Repaired task data if repair is possible, None otherwise
        """
        logger.info("Attempting to repair matching task")
        
        matching_left = task_data.get('matching_left', [])
        matching_right = task_data.get('matching_right', [])
        correct_matches = task_data.get('correct_matches', {})
        
        # Can't repair if arrays are completely missing or too small
        if not matching_left or not matching_right:
            logger.warning("Cannot repair: matching arrays are missing")
            return None
        
        if len(matching_left) < 3 or len(matching_right) < 3:
            logger.warning(f"Cannot repair: too few items (left={len(matching_left)}, right={len(matching_right)})")
            return None
        
        repaired = task_data.copy()
        repaired_left = list(matching_left)
        repaired_right = list(matching_right)
        repaired_matches = dict(correct_matches)
        
        # Repair left items
        while len(repaired_left) < 5:
            item_num = len(repaired_left)
            repaired_left.append({
                'id': f'left_{item_num}',
                'text': f'Placeholder item {item_num + 1}'
            })
            logger.info(f"Added placeholder left item: left_{item_num}")
        
        # Repair right items
        while len(repaired_right) < 5:
            item_num = len(repaired_right)
            repaired_right.append({
                'id': f'right_{item_num}',
                'text': f'Placeholder definition {item_num + 1}'
            })
            logger.info(f"Added placeholder right item: right_{item_num}")
        
        # Ensure all items have id and text
        for i, item in enumerate(repaired_left):
            if not isinstance(item, dict):
                repaired_left[i] = {'id': f'left_{i}', 'text': f'Item {i + 1}'}
            else:
                if not item.get('id'):
                    item['id'] = f'left_{i}'
                if not item.get('text'):
                    item['text'] = f'Item {i + 1}'
        
        for i, item in enumerate(repaired_right):
            if not isinstance(item, dict):
                repaired_right[i] = {'id': f'right_{i}', 'text': f'Definition {i + 1}'}
            else:
                if not item.get('id'):
                    item['id'] = f'right_{i}'
                if not item.get('text'):
                    item['text'] = f'Definition {i + 1}'
        
        # Repair correct_matches
        left_ids = [item['id'] for item in repaired_left]
        right_ids = [item['id'] for item in repaired_right]
        
        for i, left_id in enumerate(left_ids):
            if left_id not in repaired_matches:
                # Map to corresponding right item by index
                repaired_matches[left_id] = right_ids[i]
                logger.info(f"Added missing match: {left_id} -> {right_ids[i]}")
        
        repaired['matching_left'] = repaired_left
        repaired['matching_right'] = repaired_right
        repaired['correct_matches'] = repaired_matches
        
        logger.info("Successfully repaired matching task")
        return repaired
    
    def validate_matching_structure(self, task_data: Dict[str, Any]) -> List[str]:
        """
        Specific validation for matching task structure.
        
        This is a convenience method that focuses only on matching-specific validation.
        
        Args:
            task_data: Task data to validate
            
        Returns:
            List of error messages (empty if valid)
        """
        return self._validate_matching(task_data)
    
    def log_validation_failure(self, task_data: Dict[str, Any], errors: List[str]) -> None:
        """
        Log detailed information about validation failures.
        
        Args:
            task_data: Task data that failed validation
            errors: List of validation error messages
        """
        task_id = task_data.get('id', 'unknown')
        format_type = task_data.get('format_type', 'unknown')
        
        logger.error(f"Task validation failed for task {task_id} (format: {format_type})")
        logger.error(f"Validation errors ({len(errors)}):")
        for i, error in enumerate(errors, 1):
            logger.error(f"  {i}. {error}")
        
        # Log task structure for debugging
        if format_type == 'matching':
            matching_left = task_data.get('matching_left', [])
            matching_right = task_data.get('matching_right', [])
            correct_matches = task_data.get('correct_matches', {})
            
            logger.error(f"Matching task structure:")
            logger.error(f"  - matching_left: {len(matching_left)} items")
            logger.error(f"  - matching_right: {len(matching_right)} items")
            logger.error(f"  - correct_matches: {len(correct_matches)} mappings")
            
            if matching_left:
                logger.error(f"  - matching_left sample: {matching_left[0] if matching_left else 'N/A'}")
            if matching_right:
                logger.error(f"  - matching_right sample: {matching_right[0] if matching_right else 'N/A'}")
            if correct_matches:
                first_key = next(iter(correct_matches))
                logger.error(f"  - correct_matches sample: {first_key} -> {correct_matches[first_key]}")
