import type { PmQuestion } from '../types';

export const pmQuestions: PmQuestion[] = [
  {
    id: 'pm-understand',
    prompt: 'Your team notices that many users create an account but never complete their first purchase. What should you do first?',
    choices: [
      'Immediately redesign the checkout page',
      'Interview users and review funnel data to understand where and why they are dropping off',
      'Offer every new user a large discount',
      'Add more notifications reminding users to purchase',
    ],
    correctIndex: 1,
    explanation: 'The strongest first step is to understand the problem before choosing a solution. Combining behavioral data with user research helps reveal both where users drop off and why.',
    correctFeedback: 'Great PM instinct: understand before solving.',
  },
  {
    id: 'pm-prioritize',
    prompt: 'You have three possible features to build next. What is the best way to prioritize them?',
    choices: [
      'Build the feature requested by the loudest stakeholder',
      'Build the easiest feature first',
      'Compare user impact, business value, effort, confidence, and strategic alignment',
      'Build all three at the same time',
    ],
    correctIndex: 2,
    explanation: 'Good prioritization balances expected impact with effort, evidence, risk, and company goals rather than relying on volume or intuition alone.',
    correctFeedback: 'Thoughtful tradeoffs are the heart of product management.',
  },
  {
    id: 'pm-metrics',
    prompt: 'You launch a new feature designed to help users discover relevant products. Which metric is the strongest primary success metric?',
    choices: [
      'Number of engineers who worked on the feature',
      'Number of times the product page was redesigned',
      'Percentage of users who engage with a recommended product and continue toward a meaningful action',
      'Total number of meetings held during development',
    ],
    correctIndex: 2,
    explanation: 'The strongest metric reflects whether the feature creates its intended user outcome, rather than whether the feature simply exists or receives superficial activity.',
    correctFeedback: 'You’re connecting the feature to real user value.',
  },
  {
    id: 'pm-experiment',
    prompt: 'An A/B test increases clicks by 12% but decreases completed purchases by 5%. What should the PM do?',
    choices: [
      'Launch it because clicks increased',
      'Ignore the purchase decline because it is a smaller percentage',
      'Investigate the full funnel and determine whether the change harms the primary business and user outcome',
      'End all future experimentation',
    ],
    correctIndex: 2,
    explanation: 'An upstream metric such as clicks can improve while a more important downstream metric becomes worse. The PM should evaluate the entire user journey and the original product goal.',
    correctFeedback: 'Exactly—guardrail metrics matter.',
  },
  {
    id: 'pm-alignment',
    prompt: 'Design and engineering disagree about whether a feature should launch this month. What is the best PM response?',
    choices: [
      'Choose whichever team you agree with personally',
      'Escalate immediately without discussing the issue',
      'Clarify the user goal, constraints, risks, and evidence, then help the group evaluate the tradeoffs together',
      'Delay the feature indefinitely',
    ],
    correctIndex: 2,
    explanation: 'A strong PM creates shared context and helps teams make informed tradeoffs. The goal is not to win the argument, but to reach the best decision for users and the business.',
    correctFeedback: 'Calm alignment beats forcing consensus.',
  },
  {
    id: 'pm-launch',
    prompt: 'A newly launched feature receives several reports of a serious usability issue. What should the PM do first?',
    choices: [
      'Pretend the reports are isolated',
      'Add more features before investigating',
      'Assess severity and scope, coordinate with the team, and decide whether to fix, limit, or roll back the feature',
      'Wait until the next quarterly planning cycle',
    ],
    correctIndex: 2,
    explanation: 'The immediate priority is understanding the impact and protecting users. The appropriate response may be a quick fix, limited rollout, or rollback depending on severity.',
    correctFeedback: 'Strong answer: protect users, assess quickly, and respond calmly.',
  },
];
