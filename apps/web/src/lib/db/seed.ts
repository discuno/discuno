import 'dotenv/config'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import {
  majors,
  posts,
  schools,
  userMajors,
  userProfiles,
  users,
  userSchools,
} from '~/server/db/schema'

/**
 * Database seeding utility for Railway PostgreSQL using manual insertion
 * Only runs for development and preview environments for safety
 */

type Environment = 'local' | 'preview' | 'production'

const createSeedConnection = () => {
  const databaseUrl = process.env.DATABASE_URL

  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is not set')
  }

  const seedClient = postgres(databaseUrl, {
    max: 1,
    transform: postgres.camel,
  })

  return { client: seedClient, db: drizzle(seedClient) }
}

// Sample data arrays
const majorNames = [
  'Computer Science',
  'Business Administration',
  'Psychology',
  'Engineering',
  'Pre-Medicine',
  'English Literature',
  'Economics',
  'Political Science',
  'Biology',
  'Mathematics',
  'Physics',
  'Chemistry',
  'History',
  'Philosophy',
  'Art History',
]

const schoolData = [
  {
    name: 'Stanford University',
    location: 'Stanford, CA',
    image: 'https://images.unsplash.com/photo-1562774053-701939374585?w=400&h=300&fit=crop',
  },
  {
    name: 'Harvard University',
    location: 'Cambridge, MA',
    image: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=400&h=300&fit=crop',
  },
  {
    name: 'MIT',
    location: 'Cambridge, MA',
    image: 'https://images.unsplash.com/photo-1607237138185-eedd9c632b0b?w=400&h=300&fit=crop',
  },
  {
    name: 'UC Berkeley',
    location: 'Berkeley, CA',
    image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=300&fit=crop',
  },
  {
    name: 'Yale University',
    location: 'New Haven, CT',
    image: 'https://images.unsplash.com/photo-1564981797816-1043664bf78d?w=400&h=300&fit=crop',
  },
  {
    name: 'Princeton University',
    location: 'Princeton, NJ',
    image: 'https://images.unsplash.com/photo-1567168544813-cc03465b4fa8?w=400&h=300&fit=crop',
  },
  {
    name: 'Columbia University',
    location: 'New York, NY',
    image: 'https://images.unsplash.com/photo-1596496050827-8299e0220de1?w=400&h=300&fit=crop',
  },
  {
    name: 'University of Chicago',
    location: 'Chicago, IL',
    image: 'https://images.unsplash.com/photo-1564981797816-1043664bf78d?w=400&h=300&fit=crop',
  },
  {
    name: 'NYU',
    location: 'New York, NY',
    image: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=400&h=300&fit=crop',
  },
  {
    name: 'UCLA',
    location: 'Los Angeles, CA',
    image: 'https://images.unsplash.com/photo-1562774053-701939374585?w=400&h=300&fit=crop',
  },
]

const userImages = [
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1494790108755-2616c65a0c3e?w=150&h=150&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1506794778491-fd4f5e7a1e3e?w=150&h=150&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1592206167183-d9aca75c0999?w=150&h=150&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1607990281513-2c110a25bd8c?w=150&h=150&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1521119989659-a83eee488004?w=150&h=150&fit=crop&crop=face',
]

const schoolYears = ['Freshman', 'Sophomore', 'Junior', 'Senior', 'Graduate'] as const

const postTitles = [
  'Tips for Landing Your First Tech Internship',
  'How I Switched from Pre-Med to Computer Science',
  'Study Abroad Experience in Tokyo',
  'Surviving Organic Chemistry: A Complete Guide',
  'Networking Tips for Introverted Students',
  'My Journey from Community College to Ivy League',
  'Balancing Work and School: Time Management Tips',
  'How to Ace Technical Interviews',
  'Graduate School Application Process',
  'Finding Research Opportunities as an Undergrad',
  'Dealing with Imposter Syndrome in STEM',
  'Building a Portfolio That Stands Out',
  'The Reality of Being a First-Generation College Student',
  'How to Make the Most of Office Hours',
  'Internship vs. Full-time: What to Expect',
  'Transitioning from Online to In-Person Classes',
  'How to Choose the Right Major',
  'Building Professional Relationships in College',
  'Study Strategies That Actually Work',
  'Preparing for the GRE/MCAT/LSAT',
  'How to Get Published as an Undergraduate',
  "Making Friends in College: An Introvert's Guide",
  'The Importance of Mental Health in Academia',
  'How to Find Your Passion in College',
  'Budgeting Tips for Broke College Students',
  'How to Write a Compelling Personal Statement',
  'Maximizing Your College Experience',
  'Dealing with Academic Pressure',
  'How to Build Confidence in Public Speaking',
  'The Art of Effective Note-Taking',
  'How to Approach Professors for Recommendations',
  'Balancing Social Life and Academics',
  'How to Overcome Procrastination',
  'Building Leadership Skills in College',
  'How to Make the Most of Career Fairs',
  'Dealing with Rejection: A Growth Mindset',
  'How to Find Your Tribe in College',
  'The Power of Mentorship',
  'How to Navigate College Politics',
  'Building Resilience Through Challenges',
]

const postDescriptions = [
  "After landing internships at top tech companies, here are the strategies that actually work. From networking to technical preparation, I'll share everything I learned.",
  "Switching majors felt overwhelming, but it was the best decision I made. Here's my complete timeline and advice for anyone considering a similar change.",
  "Studying abroad transformed my perspective and opened doors I never imagined. Here's what I wish I knew before going and how to make the most of the experience.",
  "Organic chemistry doesn't have to be a nightmare. These study techniques and resources helped me go from struggling to excelling.",
  'Networking as an introvert seemed impossible until I found these strategies. Now I actually enjoy professional events and have built meaningful connections.',
  'The path from community college to an Ivy League school taught me resilience and opened my eyes to opportunities I never thought possible.',
  'Working 20 hours a week while maintaining a 3.8 GPA taught me time management skills that I use every day. Here are my proven strategies.',
  "Technical interviews can be intimidating, but with the right preparation, you can walk in with confidence. Here's my complete guide.",
  'The graduate school application process is complex, but breaking it down into manageable steps makes it much less overwhelming.',
  'Research opportunities as an undergrad can be competitive, but there are ways to stand out and find the perfect fit for your interests.',
  "Imposter syndrome is real, especially in STEM fields. Here's how I learned to recognize it and develop strategies to overcome it.",
  "Your portfolio is often the first impression you make. Here's how to create one that showcases your skills and personality effectively.",
  "Being first-generation comes with unique challenges, but also unique strengths. Here's what I've learned about navigating this journey.",
  "Office hours are underutilized by most students, but they're one of the best resources available. Here's how to make them work for you.",
  "The transition from internship to full-time work involves more than just increased responsibility. Here's what to expect and how to prepare.",
  'Going back to in-person classes after online learning required major adjustments. Here are the strategies that helped me succeed.',
  "Choosing a major is one of the biggest decisions you'll make in college. Here's a framework for making this choice with confidence.",
  "Professional relationships in college can shape your entire career. Here's how to build authentic connections that last.",
  'Not all study strategies are created equal. After trying everything, here are the methods that actually improved my grades.',
  "Standardized test prep can be overwhelming. Here's a realistic timeline and proven strategies for success on any major exam.",
  "Getting published as an undergrad seemed impossible until I learned the right approach. Here's how to get your research out there.",
  "Making friends in college as an introvert required me to step out of my comfort zone, but it was worth it. Here's what worked.",
  "Mental health is crucial for academic success, but it's often overlooked. Here are the resources and strategies that made a difference.",
  "Finding your passion isn't always obvious. Here's how I discovered mine through exploration and reflection.",
  'College is expensive, but there are ways to stretch your budget. Here are the money-saving tips that actually work.',
  "Personal statements can make or break your application. Here's how to write one that stands out from the thousands of others.",
  "College offers so many opportunities, but it's easy to get overwhelmed. Here's how to prioritize and make the most of your time.",
  "Academic pressure is real, but it doesn't have to control your life. Here are healthy ways to manage stress and expectations.",
  "Public speaking terrified me, but I learned that confidence comes from preparation and practice. Here's my step-by-step approach.",
  'Effective note-taking is a skill that will serve you throughout your career. Here are the methods that transformed my learning.',
  "Getting strong recommendation letters requires more than just good grades. Here's how to build relationships that lead to glowing endorsements.",
  "Balancing social life and academics is challenging, but it's essential for a well-rounded college experience. Here's how I found balance.",
  'Procrastination was my biggest enemy until I learned these evidence-based strategies. Now I actually look forward to getting started.',
  "Leadership opportunities in college can set you up for future success. Here's how to find and excel in leadership roles.",
  "Career fairs can be overwhelming, but with the right preparation, they're incredible networking opportunities. Here's my game plan.",
  "Rejection is part of life, but it doesn't have to define you. Here's how I learned to use setbacks as fuel for growth.",
  "Finding your people in college can take time, but it's worth the effort. Here's how I built lasting friendships and found my community.",
  "Having a mentor changed my college experience completely. Here's how to find mentors and build meaningful relationships with them.",
  "College politics exist whether we acknowledge them or not. Here's how to navigate them while staying true to your values.",
  "Resilience isn't built overnight, but every challenge is an opportunity to grow stronger. Here's what I've learned about bouncing back.",
]

// Helper functions
const getRandomElement = <T>(array: readonly T[]): T => {
  const index = Math.floor(Math.random() * array.length)
  const value = array[index]

  if (value === undefined) {
    throw new Error('Cannot get random element from empty array')
  }

  return value
}

const getRandomElements = <T>(array: readonly T[], count: number): T[] => {
  const shuffled = [...array].sort(() => 0.5 - Math.random())
  return shuffled.slice(0, count)
}

const generateUserData = (count: number) => {
  const users = []
  for (let i = 0; i < count; i++) {
    users.push({
      name: `User ${i + 1}`,
      email: `user${i + 1}@example.com`,
      image: getRandomElement(userImages),
    })
  }
  return users
}

export const seedDatabase = async (environment?: Environment) => {
  const targetEnv = environment

  // Safety check: don't allow seeding production
  if (targetEnv === 'production') {
    throw new Error('❌ Seeding is not allowed in production environment for safety')
  }

  console.log(`🌱 Starting database seeding for environment: ${targetEnv}`)

  const { client, db } = createSeedConnection()

  try {
    // Step 1: Insert majors
    console.log('📚 Inserting majors...')
    const insertedMajors = await db
      .insert(majors)
      .values(majorNames.map(name => ({ name })))
      .returning()

    // Step 2: Insert schools
    console.log('🏫 Inserting schools...')
    const insertedSchools = await db.insert(schools).values(schoolData).returning()

    // Step 3: Insert users
    console.log('👥 Inserting users...')
    const userData = generateUserData(50)
    const insertedUsers = await db.insert(users).values(userData).returning()

    // Step 4: Insert user profiles
    console.log('📋 Inserting user profiles...')
    const userProfileData = insertedUsers.map(user => ({
      userId: user.id,
      bio: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt.',
      schoolYear: getRandomElement(schoolYears),
      graduationYear: Math.floor(Math.random() * 5) + 2025, // 2025-2029
      eduEmail: `${user.name?.toLowerCase().replace(/\s+/g, '.')}@university.edu`,
      isEduVerified: Math.random() > 0.5,
    }))
    await db.insert(userProfiles).values(userProfileData)

    // Step 5: Insert user majors (each user gets one major)
    console.log('🎓 Inserting user majors...')
    const userMajorData = insertedUsers.map(user => ({
      userId: user.id,
      majorId: getRandomElement(insertedMajors).id,
    }))
    await db.insert(userMajors).values(userMajorData)

    // Step 6: Insert user schools (each user gets one school)
    console.log('🏛️ Inserting user schools...')
    const userSchoolData = insertedUsers.map(user => ({
      userId: user.id,
      schoolId: getRandomElement(insertedSchools).id,
    }))
    await db.insert(userSchools).values(userSchoolData)

    // Step 7: Insert posts (40 out of 50 users get a post)
    console.log('📝 Inserting posts...')
    const selectedUsers = getRandomElements(insertedUsers, 40)
    const selectedTitles = getRandomElements(postTitles, 40)
    const selectedDescriptions = getRandomElements(postDescriptions, 40)

    const postData = selectedUsers.map((user, index) => ({
      name: selectedTitles[index],
      description: selectedDescriptions[index],
      createdById: user.id,
    }))
    await db.insert(posts).values(postData)

    console.log('🎉 Database seeding completed successfully!')
    console.log('📊 Generated realistic data including:')
    console.log('  - 50 users with profiles')
    console.log('  - 40 posts with engaging content')
    console.log('  - 15 majors and 10 schools')
    console.log('  - Complete user relationships')
  } catch (error) {
    console.error(`❌ Seeding failed for ${targetEnv}:`, error)
    throw error
  } finally {
    await client.end()
    console.log(`🔌 Database connection closed for ${targetEnv}`)
  }
}

// CLI support
if (import.meta.url === `file://${process.argv[1]}`) {
  const environment = process.argv[2] as Environment | undefined

  if (environment && !['local', 'preview'].includes(environment)) {
    console.error(
      '❌ Invalid environment for seeding. Use: local or preview (production not allowed)'
    )
    process.exit(1)
  }

  seedDatabase(environment)
    .then(() => {
      console.log('🌟 Seeding process completed')
      process.exit(0)
    })
    .catch(error => {
      console.error('💥 Seeding process failed:', error)
      process.exit(1)
    })
}
