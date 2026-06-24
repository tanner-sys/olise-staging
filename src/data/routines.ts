import type { Routine } from '../types/routine'

export const staticRoutines: Routine[] = [
  {
    id: 'daily-check-in',
    title: 'Daily Check In',
    description:
      'A quick 9-question daily pulse on sleep, focus, mood, and more — scored by section with a composite trend over time.',
    frequency: 'Daily',
    questions: [
      {
        id: 'sleep',
        section: 'Sleep',
        prompt: 'How well did you sleep last night?',
        lowLabel: 'Very poor',
        highLabel: 'Excellent',
      },
      {
        id: 'focus',
        section: 'Focus',
        prompt: 'How would you rate your focus and attention today?',
        lowLabel: 'Very poor',
        highLabel: 'Excellent',
      },
      {
        id: 'mood',
        section: 'Mood',
        prompt: 'How stable and positive has your mood felt?',
        lowLabel: 'Very low',
        highLabel: 'Very positive',
      },
      {
        id: 'energy',
        section: 'Energy',
        prompt: 'How would you describe your energy levels today?',
        lowLabel: 'Depleted',
        highLabel: 'Energized',
      },
      {
        id: 'medication',
        section: 'Medication',
        prompt: 'How consistent were you with your medication plan?',
        lowLabel: 'Not at all',
        highLabel: 'Fully consistent',
      },
      {
        id: 'nutrition',
        section: 'Nutrition',
        prompt: 'How nourished and balanced did your eating feel?',
        lowLabel: 'Very poor',
        highLabel: 'Very balanced',
      },
      {
        id: 'social',
        section: 'Social',
        prompt: 'How connected did you feel to others today?',
        lowLabel: 'Isolated',
        highLabel: 'Very connected',
      },
      {
        id: 'activity',
        section: 'Activity',
        prompt: 'How much meaningful physical movement did you get?',
        lowLabel: 'None',
        highLabel: 'Plenty',
      },
      {
        id: 'overall',
        section: 'Overall',
        prompt: 'Overall, how was your day?',
        lowLabel: 'Very difficult',
        highLabel: 'Great',
      },
    ],
  },
]

/** @deprecated Use fetchRoutines() / useRoutines() — static fallback when Supabase is unavailable */
export const routines = staticRoutines
