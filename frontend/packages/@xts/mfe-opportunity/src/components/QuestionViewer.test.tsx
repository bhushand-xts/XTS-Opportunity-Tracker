import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { QuestionViewer } from './QuestionViewer';

afterEach(cleanup);
const questions = [
  { id: '1', text: 'Describe your hosting solution.', category: 'Technical', sourceReference: '', validated: true },
  { id: '2', text: 'Provide your pricing.', category: 'Commercial', sourceReference: '', validated: true },
  { id: '3', text: 'Describe backup and recovery.', category: 'Technical', sourceReference: '', validated: true },
  { id: '4', text: 'Additional requirement.', category: null, sourceReference: '', validated: true },
];
it('shows categories first, displays one category at a time, and numbers each category from 1', () => {
  render(<QuestionViewer questions={questions} />);
  expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
  expect(screen.queryByText('Describe your hosting solution.')).not.toBeInTheDocument();
  expect(screen.getByText('Select a category to view its questions')).toBeVisible();
  expect(screen.queryByRole('button', { name: /All categories/ })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /^Technical/ }));
  const technical = within(screen.getByRole('region', { name: 'Technical questions' }));
  expect(technical.getByText('Describe your hosting solution.')).toBeVisible();
  expect(technical.getByText('Describe backup and recovery.')).toBeVisible();
  expect(technical.getByLabelText('Question 1')).toHaveTextContent('1');
  expect(technical.getByLabelText('Question 2')).toHaveTextContent('2');
  expect(screen.queryByText('Provide your pricing.')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /^Commercial/ }));
  expect(screen.queryByText('Describe your hosting solution.')).not.toBeInTheDocument();
  expect(screen.getByText('Provide your pricing.')).toBeVisible();
  expect(screen.getByLabelText('Question 1')).toHaveTextContent('1');
  expect(screen.queryByLabelText('Question 2')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /^Other/ }));
  expect(screen.getByText('Additional requirement.')).toBeVisible();
});
it('shows an empty state when no questions have been saved', () => {
  render(<QuestionViewer questions={[]} />);
  expect(screen.getByText('No questions added.')).toBeVisible();
  expect(screen.queryByRole('group')).not.toBeInTheDocument();
});
