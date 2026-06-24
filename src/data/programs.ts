import type { Program } from '../types/program'

export const staticPrograms: Program[] = [
  {
    id: 'adhd-biomarkers-pediatric',
    title: 'Using Biomarkers to Treat ADHD: The future of pediatric care',
    description:
      'A guided deep dive into how biomarkers are reshaping ADHD diagnosis, treatment monitoring, and personalized pediatric care.',
    duration: '~15 min',
    tags: ['ADHD', 'Pediatrics', 'Biomarkers'],
    steps: [
      {
        id: 'intro',
        type: 'intro',
        title: 'Welcome to this program',
        subtitle: 'Using Biomarkers to Treat ADHD',
        body: [
          'This program walks you through how biomarkers are changing the way clinicians understand, diagnose, and treat ADHD in children.',
          'You will complete a short assessment, explore three guided modules, and reflect on what matters most for your family or practice.',
        ],
        bullets: [
          'Understand what biomarkers mean in ADHD care',
          'Learn how pediatric treatment is evolving',
          'Identify questions to bring to your care team',
        ],
      },
      {
        id: 'assessment',
        type: 'assessment',
        title: 'Baseline assessment',
        subtitle: 'Help us tailor this experience',
        questions: [
          {
            id: 'role',
            prompt: 'Which best describes you?',
            options: [
              'Parent or caregiver',
              'Pediatric clinician',
              'Educator or school staff',
              'Exploring for personal learning',
            ],
          },
          {
            id: 'familiarity',
            prompt: 'How familiar are you with biomarkers in ADHD care?',
            options: [
              'Not familiar at all',
              'Heard the term but unsure what it means',
              'Somewhat familiar',
              'Very familiar',
            ],
          },
          {
            id: 'goal',
            prompt: 'What do you most hope to get from this program?',
            options: [
              'Better questions for our doctor',
              'Understanding treatment options',
              'Staying current on pediatric care',
              'Supporting a child with ADHD',
            ],
          },
        ],
      },
      {
        id: 'module-1',
        type: 'content',
        title: 'What are biomarkers in ADHD?',
        subtitle: 'Module 1 of 3',
        body: [
          'Biomarkers are measurable indicators — from cognitive tests, digital behavior patterns, sleep data, or lab values — that help clinicians understand how ADHD presents and responds to treatment in a specific child.',
          'Unlike a single snapshot diagnosis, biomarkers can support a more dynamic picture of attention regulation, impulsivity, and treatment response over time.',
        ],
        bullets: [
          'Biomarkers complement clinical interviews and rating scales',
          'They can help track whether a treatment plan is working',
          'Pediatric care is moving toward more personalized monitoring',
        ],
      },
      {
        id: 'module-2',
        type: 'content',
        title: 'Why biomarkers matter in pediatric care',
        subtitle: 'Module 2 of 3',
        body: [
          'Children with ADHD are not a uniform group. Two children with the same diagnosis may respond differently to medication, therapy, or school supports.',
          'Biomarker-informed care aims to reduce trial-and-error by giving families and clinicians clearer signals about what is changing — and what is not.',
        ],
        bullets: [
          'Earlier insight into treatment response',
          'More objective data for care conversations',
          'Potential to align home, school, and clinical observations',
        ],
      },
      {
        id: 'module-3',
        type: 'content',
        title: 'Partnering with your care team',
        subtitle: 'Module 3 of 3',
        body: [
          'Biomarkers do not replace clinical judgment. They work best when families and clinicians interpret them together, alongside developmental history, school feedback, and day-to-day observations.',
          'The goal is not more data for its own sake — it is better decisions, clearer follow-up, and more confident pediatric care.',
        ],
        bullets: [
          'Ask how biomarkers fit into your child\'s current plan',
          'Discuss what would count as meaningful improvement',
          'Agree on when and how progress will be reviewed',
        ],
      },
      {
        id: 'reflection',
        type: 'reflection',
        title: 'Reflection',
        subtitle: 'Make it personal',
        reflectionPrompt:
          'What is one question you want to bring to your next conversation about ADHD care — and what would meaningful progress look like for your child or patient?',
      },
      {
        id: 'completion',
        type: 'completion',
        title: 'Program complete',
        subtitle: 'Nice work',
        body: [
          'You have completed Using Biomarkers to Treat ADHD. You now have a stronger foundation for understanding how biomarker-informed care may shape pediatric ADHD treatment.',
          'Many families turn insights like these into routines — weekly check-ins, symptom tracking, or prep for clinical visits.',
        ],
      },
    ],
  },
]

/** @deprecated Use fetchPrograms() / usePrograms() — static fallback when Supabase is unavailable */
export const programs = staticPrograms
