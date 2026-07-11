import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import App, { DestinationReveal } from './App';
import { STORAGE_KEY } from './utils/storage';

describe('The Northeast Mystery Getaway', () => {
  beforeEach(() => window.localStorage.clear());

  it('allows the PM warm-up to be skipped without changing the travel score', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /begin the journey/i }));
    await user.click(screen.getByRole('button', { name: /skip to the journey/i }));

    expect(screen.getByText('Which New York town is home to the National Baseball Hall of Fame?')).toBeInTheDocument();
    expect(screen.getByText('0 / 14')).toBeInTheDocument();
  });

  it('shows supportive PM feedback after an answer', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /begin the journey/i }));
    await user.click(screen.getByRole('button', { name: /start the warm-up/i }));
    await user.click(screen.getByRole('button', { name: /interview users and review funnel data/i }));

    expect(screen.getByText('Great PM instinct: understand before solving.')).toBeInTheDocument();
    expect(screen.getByText(/combining behavioral data/i)).toBeInTheDocument();
  });

  it('completes the PM warm-up and starts the regional route at zero', async () => {
    const user = userEvent.setup();
    const correctChoices = [
      'Interview users and review funnel data to understand where and why they are dropping off',
      'Compare user impact, business value, effort, confidence, and strategic alignment',
      'Percentage of users who engage with a recommended product and continue toward a meaningful action',
      'Investigate the full funnel and determine whether the change harms the primary business and user outcome',
      'Clarify the user goal, constraints, risks, and evidence, then help the group evaluate the tradeoffs together',
      'Assess severity and scope, coordinate with the team, and decide whether to fix, limit, or roll back the feature',
    ];
    render(<App />);

    await user.click(screen.getByRole('button', { name: /begin the journey/i }));
    await user.click(screen.getByRole('button', { name: /start the warm-up/i }));
    for (const [index, choice] of correctChoices.entries()) {
      await user.click(screen.getByRole('button', { name: choice }));
      await user.click(screen.getByRole('button', { name: index === correctChoices.length - 1 ? 'Finish Warm-Up' : 'Next Practice Question' }));
    }
    await user.click(screen.getByRole('button', { name: /begin the northeast journey/i }));

    expect(screen.getByText('Which New York town is home to the National Baseball Hall of Fame?')).toBeInTheDocument();
    expect(screen.getByText('0 / 14')).toBeInTheDocument();
  });

  it('adds correct regional answers to the score and locks submitted choices', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /begin the journey/i }));
    await user.click(screen.getByRole('button', { name: /skip to the journey/i }));
    await user.click(screen.getByRole('button', { name: 'Cooperstown' }));

    expect(screen.getByText('1 / 14')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Saratoga Springs' })).toBeDisabled();
  });

  it('keeps the destination out of the landing page and restores saved regional progress', () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
      screen: 'journey',
      queue: ['ny-1', 'ny-2'],
      activeIndex: 1,
      answers: { 'ny-1': true },
      selectedAnswer: null,
      submitted: false,
      retrying: false,
    }));
    render(<App />);

    expect(screen.getByText('What is New York’s official state nickname?')).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent('New Haven');
  });

  it('displays the destination only in the reveal view', () => {
    render(<DestinationReveal onPlan={() => {}} />);

    expect(screen.getByText('New Haven, Connecticut!')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /see the weekend plan/i })).toBeInTheDocument();
  });

  it('clears persisted progress when the player confirms restart', async () => {
    const user = userEvent.setup();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ screen: 'results', queue: ['ny-1'], activeIndex: 0, answers: { 'ny-1': false }, selectedAnswer: null, submitted: false, retrying: false }));
    render(<App />);

    await user.click(screen.getAllByRole('button', { name: /^restart game$/i })[0]);
    await user.click(screen.getAllByRole('button', { name: /^restart game$/i })[1]);

    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(screen.getByText(/We’re leaving from New York/i)).toBeInTheDocument();
  });
});
