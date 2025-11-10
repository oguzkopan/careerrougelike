import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import TaskDetailModal from '../TaskDetailModal';
import { WorkTask } from '../../types';

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock confetti
jest.mock('../shared/confetti', () => ({
  celebrateTaskComplete: jest.fn(),
}));

// Mock VoiceRecorder component
jest.mock('../shared/VoiceRecorder', () => ({
  __esModule: true,
  default: () => <div data-testid="voice-recorder">Voice Recorder</div>,
}));

describe('TaskDetailModal - Format Types Rendering', () => {
  const baseTask: Partial<WorkTask> = {
    id: 'test-task-1',
    title: 'Test Task',
    description: 'Test task description',
    requirements: ['Requirement 1', 'Requirement 2'],
    acceptanceCriteria: ['Criteria 1', 'Criteria 2'],
    difficulty: 3,
    status: 'pending',
    xpReward: 50,
    createdAt: new Date().toISOString(),
  };

  const mockOnClose = jest.fn();
  const mockOnSubmit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('1. Text Answer Format', () => {
    it('should display textarea for text_answer format', () => {
      const task: WorkTask = {
        ...baseTask,
        formatType: 'text_answer',
      } as WorkTask;

      render(
        <TaskDetailModal
          task={task}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          isSubmitting={false}
        />
      );

      // Check for textarea
      const textarea = screen.getByPlaceholderText(/Enter your solution/i);
      expect(textarea).toBeInTheDocument();
      expect(textarea.tagName).toBe('TEXTAREA');
      
      // Check label
      expect(screen.getByText('Your Solution')).toBeInTheDocument();
      
      // Verify textarea is editable
      fireEvent.change(textarea, { target: { value: 'My solution text' } });
      expect(textarea).toHaveValue('My solution text');
    });

    it('should show character count for text_answer', () => {
      const task: WorkTask = {
        ...baseTask,
        formatType: 'text_answer',
      } as WorkTask;

      render(
        <TaskDetailModal
          task={task}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          isSubmitting={false}
        />
      );

      const textarea = screen.getByPlaceholderText(/Enter your solution/i);
      fireEvent.change(textarea, { target: { value: 'Test' } });
      
      expect(screen.getByText('4 characters')).toBeInTheDocument();
    });
  });

  describe('2. Multiple Choice Format', () => {
    it('should display radio buttons for multiple_choice format', () => {
      const task: WorkTask = {
        ...baseTask,
        formatType: 'multiple_choice',
        options: [
          { id: 'A', text: 'Option A' },
          { id: 'B', text: 'Option B' },
          { id: 'C', text: 'Option C' },
          { id: 'D', text: 'Option D' },
        ],
      } as WorkTask;

      render(
        <TaskDetailModal
          task={task}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          isSubmitting={false}
        />
      );

      // Check label
      expect(screen.getByText('Select Your Answer')).toBeInTheDocument();

      // Check all options are rendered
      expect(screen.getByText('Option A')).toBeInTheDocument();
      expect(screen.getByText('Option B')).toBeInTheDocument();
      expect(screen.getByText('Option C')).toBeInTheDocument();
      expect(screen.getByText('Option D')).toBeInTheDocument();

      // Check radio buttons exist
      const radioButtons = screen.getAllByRole('radio');
      expect(radioButtons).toHaveLength(4);

      // Verify radio button selection works
      fireEvent.click(radioButtons[1]);
      expect(radioButtons[1]).toBeChecked();
    });

    it('should highlight selected option in multiple_choice', () => {
      const task: WorkTask = {
        ...baseTask,
        formatType: 'multiple_choice',
        options: [
          { id: 'A', text: 'Option A' },
          { id: 'B', text: 'Option B' },
        ],
      } as WorkTask;

      render(
        <TaskDetailModal
          task={task}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          isSubmitting={false}
        />
      );

      const radioButtons = screen.getAllByRole('radio');
      const optionB = radioButtons[1].closest('label');
      
      // Initially not highlighted
      expect(optionB).not.toHaveClass('border-indigo-500');
      
      // Click and check highlight
      fireEvent.click(radioButtons[1]);
      expect(optionB).toHaveClass('border-indigo-500');
    });
  });

  describe('3. Matching Format', () => {
    it('should display enhanced matching UI for matching format', () => {
      const task: WorkTask = {
        ...baseTask,
        formatType: 'matching',
        matchingLeft: [
          { id: 'left_1', text: 'Item 1' },
          { id: 'left_2', text: 'Item 2' },
          { id: 'left_3', text: 'Item 3' },
        ],
        matchingRight: [
          { id: 'right_1', text: 'Match A' },
          { id: 'right_2', text: 'Match B' },
          { id: 'right_3', text: 'Match C' },
        ],
      } as WorkTask;

      render(
        <TaskDetailModal
          task={task}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          isSubmitting={false}
        />
      );

      // Check label
      expect(screen.getByText('Match the Items')).toBeInTheDocument();

      // Check progress indicator
      expect(screen.getByText('Progress:')).toBeInTheDocument();
      expect(screen.getByText('0 / 3 matched')).toBeInTheDocument();

      // Check column headers
      expect(screen.getByText('Items to Match')).toBeInTheDocument();
      expect(screen.getByText('Available Options')).toBeInTheDocument();

      // Check left items with numbered badges
      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.getByText('Item 2')).toBeInTheDocument();
      expect(screen.getByText('Item 3')).toBeInTheDocument();

      // Check right items with lettered badges
      expect(screen.getByText('Match A')).toBeInTheDocument();
      expect(screen.getByText('Match B')).toBeInTheDocument();
      expect(screen.getByText('Match C')).toBeInTheDocument();

      // Check dropdowns exist
      const selects = screen.getAllByRole('combobox');
      expect(selects).toHaveLength(3);
    });

    it('should update progress indicator when matches are made', () => {
      const task: WorkTask = {
        ...baseTask,
        formatType: 'matching',
        matchingLeft: [
          { id: 'left_1', text: 'Item 1' },
          { id: 'left_2', text: 'Item 2' },
        ],
        matchingRight: [
          { id: 'right_1', text: 'Match A' },
          { id: 'right_2', text: 'Match B' },
        ],
      } as WorkTask;

      render(
        <TaskDetailModal
          task={task}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          isSubmitting={false}
        />
      );

      // Initially 0 matched
      expect(screen.getByText('0 / 2 matched')).toBeInTheDocument();

      // Make a match
      const selects = screen.getAllByRole('combobox');
      fireEvent.change(selects[0], { target: { value: 'right_1' } });

      // Progress should update
      expect(screen.getByText('1 / 2 matched')).toBeInTheDocument();
    });

    it('should show green border when item is matched', () => {
      const task: WorkTask = {
        ...baseTask,
        formatType: 'matching',
        matchingLeft: [{ id: 'left_1', text: 'Item 1' }],
        matchingRight: [{ id: 'right_1', text: 'Match A' }],
      } as WorkTask;

      render(
        <TaskDetailModal
          task={task}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          isSubmitting={false}
        />
      );

      const select = screen.getByRole('combobox');
      const container = select.closest('.border-2');
      
      // Initially gray border
      expect(container).toHaveClass('border-gray-600');
      
      // Make match
      fireEvent.change(select, { target: { value: 'right_1' } });
      
      // Should have green border
      expect(container).toHaveClass('border-green-500');
    });
  });

  describe('4. Fill in the Blank Format', () => {
    it('should display input fields for fill_in_blank format', () => {
      const task: WorkTask = {
        ...baseTask,
        formatType: 'fill_in_blank',
        blankText: 'The {blank_1} is a {blank_2} programming language.',
        blanks: [
          { id: 'blank_1', text: '', placeholder: 'language name' },
          { id: 'blank_2', text: '', placeholder: 'type' },
        ],
      } as WorkTask;

      render(
        <TaskDetailModal
          task={task}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          isSubmitting={false}
        />
      );

      // Check label
      expect(screen.getByText('Fill in the Blanks')).toBeInTheDocument();

      // Check text is displayed
      expect(screen.getByText(/The/)).toBeInTheDocument();
      expect(screen.getByText(/is a/)).toBeInTheDocument();
      expect(screen.getByText(/programming language/)).toBeInTheDocument();

      // Check input fields exist with placeholders
      const inputs = screen.getAllByPlaceholderText(/language name|type/);
      expect(inputs).toHaveLength(2);

      // Verify inputs are editable
      fireEvent.change(inputs[0], { target: { value: 'Python' } });
      expect(inputs[0]).toHaveValue('Python');
    });

    it('should show helper text for fill_in_blank', () => {
      const task: WorkTask = {
        ...baseTask,
        formatType: 'fill_in_blank',
        blankText: 'Test {blank_1}',
        blanks: [{ id: 'blank_1', text: '', placeholder: 'answer' }],
      } as WorkTask;

      render(
        <TaskDetailModal
          task={task}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          isSubmitting={false}
        />
      );

      expect(screen.getByText('Fill in all the blanks with appropriate answers')).toBeInTheDocument();
    });
  });

  describe('5. Code Review Format', () => {
    it('should display code with line numbers for code_review format', () => {
      const task: WorkTask = {
        ...baseTask,
        formatType: 'code_review',
        code: 'function test() {\n  return null;\n}',
      } as WorkTask;

      render(
        <TaskDetailModal
          task={task}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          isSubmitting={false}
        />
      );

      // Check label
      expect(screen.getByText('Identify Bugs')).toBeInTheDocument();

      // Check instructions
      expect(screen.getByText(/Review the code below and identify all bugs/)).toBeInTheDocument();

      // Check code is displayed
      expect(screen.getByText('function test() {')).toBeInTheDocument();
      expect(screen.getByText('return null;')).toBeInTheDocument();

      // Check line numbers are displayed
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();

      // Check textarea for bug descriptions
      const textarea = screen.getByPlaceholderText(/List the bugs you found/);
      expect(textarea).toBeInTheDocument();
    });

    it('should allow entering bug descriptions in code_review', () => {
      const task: WorkTask = {
        ...baseTask,
        formatType: 'code_review',
        code: 'const x = 1;',
      } as WorkTask;

      render(
        <TaskDetailModal
          task={task}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          isSubmitting={false}
        />
      );

      const textarea = screen.getByPlaceholderText(/List the bugs you found/);
      fireEvent.change(textarea, { target: { value: 'Line 1: Variable not used' } });
      expect(textarea).toHaveValue('Line 1: Variable not used');
    });
  });

  describe('6. Prioritization Format', () => {
    it('should display draggable items for prioritization format', () => {
      const task: WorkTask = {
        ...baseTask,
        formatType: 'prioritization',
        prioritizationItems: [
          { id: 'item_1', text: 'High priority task' },
          { id: 'item_2', text: 'Medium priority task' },
          { id: 'item_3', text: 'Low priority task' },
        ],
      } as WorkTask;

      render(
        <TaskDetailModal
          task={task}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          isSubmitting={false}
        />
      );

      // Check label
      expect(screen.getByText('Prioritize Items')).toBeInTheDocument();

      // Check instructions
      expect(screen.getByText(/Drag and drop to arrange items in priority order/)).toBeInTheDocument();

      // Check all items are displayed
      expect(screen.getByText('High priority task')).toBeInTheDocument();
      expect(screen.getByText('Medium priority task')).toBeInTheDocument();
      expect(screen.getByText('Low priority task')).toBeInTheDocument();

      // Check priority numbers
      expect(screen.getByText('#1')).toBeInTheDocument();
      expect(screen.getByText('#2')).toBeInTheDocument();
      expect(screen.getByText('#3')).toBeInTheDocument();

      // Check up/down buttons exist
      const buttons = screen.getAllByRole('button');
      const upDownButtons = buttons.filter(btn => btn.textContent === '▲' || btn.textContent === '▼');
      expect(upDownButtons.length).toBeGreaterThan(0);
    });

    it('should allow reordering items with up/down buttons', () => {
      const task: WorkTask = {
        ...baseTask,
        formatType: 'prioritization',
        prioritizationItems: [
          { id: 'item_1', text: 'First' },
          { id: 'item_2', text: 'Second' },
        ],
      } as WorkTask;

      const { container } = render(
        <TaskDetailModal
          task={task}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          isSubmitting={false}
        />
      );

      // Find the down button for the first item
      const items = container.querySelectorAll('.cursor-move');
      expect(items).toHaveLength(2);
      
      // Verify initial order
      expect(within(items[0] as HTMLElement).getByText('First')).toBeInTheDocument();
      expect(within(items[1] as HTMLElement).getByText('Second')).toBeInTheDocument();
    });
  });

  describe('Common Functionality', () => {
    it('should display task details for all format types', () => {
      const task: WorkTask = {
        ...baseTask,
        formatType: 'text_answer',
      } as WorkTask;

      render(
        <TaskDetailModal
          task={task}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          isSubmitting={false}
        />
      );

      // Check common elements
      expect(screen.getByText('Test Task')).toBeInTheDocument();
      expect(screen.getByText('Test task description')).toBeInTheDocument();
      expect(screen.getByText('Requirements')).toBeInTheDocument();
      expect(screen.getByText('Requirement 1')).toBeInTheDocument();
      expect(screen.getByText('Acceptance Criteria')).toBeInTheDocument();
      expect(screen.getByText('Criteria 1')).toBeInTheDocument();
      expect(screen.getByText('+50 XP')).toBeInTheDocument();
    });

    it('should have submit button for all format types', () => {
      const formatTypes: TaskFormatType[] = [
        'text_answer',
        'multiple_choice',
        'matching',
        'fill_in_blank',
        'code_review',
        'prioritization',
      ];

      formatTypes.forEach((formatType) => {
        const task: WorkTask = {
          ...baseTask,
          formatType,
          options: formatType === 'multiple_choice' ? [{ id: 'A', text: 'Option A' }] : undefined,
          matchingLeft: formatType === 'matching' ? [{ id: 'l1', text: 'Left' }] : undefined,
          matchingRight: formatType === 'matching' ? [{ id: 'r1', text: 'Right' }] : undefined,
          blanks: formatType === 'fill_in_blank' ? [{ id: 'b1', text: '', placeholder: 'blank' }] : undefined,
          blankText: formatType === 'fill_in_blank' ? 'Test {b1}' : undefined,
          code: formatType === 'code_review' ? 'const x = 1;' : undefined,
          prioritizationItems: formatType === 'prioritization' ? [{ id: 'i1', text: 'Item' }] : undefined,
        } as WorkTask;

        const { unmount } = render(
          <TaskDetailModal
            task={task}
            onClose={mockOnClose}
            onSubmit={mockOnSubmit}
            isSubmitting={false}
          />
        );

        expect(screen.getByText('Submit Solution')).toBeInTheDocument();
        unmount();
      });
    });

    it('should disable inputs when task is completed', () => {
      const task: WorkTask = {
        ...baseTask,
        formatType: 'text_answer',
        status: 'completed',
      } as WorkTask;

      render(
        <TaskDetailModal
          task={task}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          isSubmitting={false}
        />
      );

      const textarea = screen.getByPlaceholderText(/Enter your solution/i);
      expect(textarea).toBeDisabled();
      
      const submitButton = screen.getByText('Submit Solution');
      expect(submitButton).toBeDisabled();
    });
  });
});
