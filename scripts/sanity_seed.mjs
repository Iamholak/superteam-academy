import { createClient } from '@sanity/client'

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET
const token = process.env.SANITY_API_TOKEN

if (!projectId || !dataset || !token) {
  console.error('[seed] Missing Sanity env: NEXT_PUBLIC_SANITY_PROJECT_ID, NEXT_PUBLIC_SANITY_DATASET, SANITY_API_TOKEN')
  process.exit(1)
}

const client = createClient({
  projectId,
  dataset,
  token,
  apiVersion: '2024-01-01',
  useCdn: false,
})

function id(suffix) {
  return `${Date.now()}-${suffix}`
}

async function run() {
  console.log('[seed] Seeding Superteam Academy sample content to Sanity...')

  // Lessons
  const lessonIntroId = id('lesson-intro')
  const lessonAccountId = id('lesson-account')
  const lessonCodingId = id('lesson-coding')

  const lessons = [
    {
      _id: lessonIntroId,
      _type: 'lesson',
      title: 'Introduction to Solana',
      slug: { _type: 'slug', current: 'introduction-to-solana' },
      description: 'Learn the basics of the Solana blockchain.',
      contentType: 'video',
      videoUrl: 'https://example.com/video/intro',
      estimatedMinutes: 15,
      xpReward: 100,
      orderIndex: 0,
      isPublished: true,
    },
    {
      _id: lessonAccountId,
      _type: 'lesson',
      title: 'The Account Model',
      slug: { _type: 'slug', current: 'the-account-model' },
      description: 'Understand how Solana stores data using the account model.',
      contentType: 'article',
      content: [
        { _type: 'block', style: 'normal', children: [{ _type: 'span', text: 'Everything in Solana is an account...' }] },
      ],
      estimatedMinutes: 20,
      xpReward: 150,
      orderIndex: 1,
      isPublished: true,
    },
    {
      _id: lessonCodingId,
      _type: 'lesson',
      title: 'Hello Solana (Coding)',
      slug: { _type: 'slug', current: 'hello-solana-coding' },
      description: 'Write your first Anchor program.',
      contentType: 'interactive',
      content: [
        { _type: 'block', style: 'normal', children: [{ _type: 'span', text: 'Follow the starter code to build and run.' }] },
      ],
      estimatedMinutes: 30,
      xpReward: 200,
      orderIndex: 2,
      isPublished: true,
    },
  ]

  // Course
  const courseId = id('course-solana-fundamentals')
  const course = {
    _id: courseId,
    _type: 'course',
    title: 'Solana Fundamentals',
    slug: { _type: 'slug', current: 'solana-fundamentals' },
    description: 'Start from scratch and understand the Solana blockchain inside out.',
    longDescription: [
      { _type: 'block', style: 'normal', children: [{ _type: 'span', text: 'Master Solana development from zero to production-ready.' }] },
    ],
    difficulty: 'beginner',
    category: 'web3',
    estimatedHours: 2,
    prerequisites: ['Basic JavaScript', 'Git installed'],
    learningOutcomes: [
      'Understand Solana runtime and accounts',
      'Write a simple Anchor program',
      'Interact with programs using web3.js',
    ],
    lessons: lessons.map(l => ({ _type: 'reference', _ref: l._id })),
    isPublished: true,
  }

  try {
    await client.transaction()
      .createIfNotExists(course)
      .createIfNotExists(lessons[0])
      .createIfNotExists(lessons[1])
      .createIfNotExists(lessons[2])
      .commit({ visibility: 'sync' })

    console.log('[seed] Done. You can now query courses and lessons from Sanity.')
  } catch (e) {
    console.error('[seed] Failed:', e)
    process.exit(1)
  }
}

run()
