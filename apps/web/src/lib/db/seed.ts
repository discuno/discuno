import { config } from 'dotenv'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import {
  calcomTokens,
  majors,
  mentorReviews,
  posts,
  schools,
  userMajors,
  userProfiles,
  users,
  userSchools,
  waitlist,
} from '~/server/db/schema'

/**
 * Database seeding utility for Railway PostgreSQL using manual insertion
 * Only runs for development and preview environments for safety
 *
 * This seeder creates comprehensive, realistic data including:
 * - 30 mentor users with detailed profiles and diverse backgrounds (all with Cal.com accounts)
 * - 40+ majors across STEM, liberal arts, business, and other fields
 * - 15 prestigious schools with locations and images
 * - User-school and user-major relationships (30% double majors)
 * - All users create posts with engaging titles and descriptions
 * - All users are mentors with realistic reviews (2-8 reviews each)
 * - Realistic mentor review ratings (70% 5-star, 20% 4-star, 10% lower)
 * - 30 waitlist entries with varied email domains
 * - Smart graduation year calculation based on current school year
 * - Diverse, realistic user bios covering different academic paths
 * - Cal.com managed user accounts and tokens for all users
 */

type Environment = 'local' | 'preview' | 'production'

const loadEnvironmentConfig = (environment?: Environment) => {
  if (!environment) {
    // Load default .env if no environment specified
    config({ path: '.env' })
    return
  }

  const envFiles = {
    local: '.env.local',
    preview: '.env.preview',
    production: '.env.production',
  }

  const envFile = envFiles[environment]
  console.log(`📄 Loading environment config from: ${envFile}`)

  try {
    // Load environment-specific file first with override
    config({ path: envFile, override: true })

    // Load default .env as fallback for any missing variables
    config({ path: '.env' })
  } catch {
    console.log(`⚠️  Could not load ${envFile}, trying .env as fallback`)
    config({ path: '.env' })
  }
}

const createSeedConnection = (environment?: Environment) => {
  // Load the appropriate environment configuration
  loadEnvironmentConfig(environment)

  const databaseUrl = process.env.DATABASE_URL

  if (!databaseUrl) {
    throw new Error(`DATABASE_URL environment variable is not set for environment: ${environment}`)
  }

  const seedClient = postgres(databaseUrl, {
    max: 1,
  })
  const db = drizzle(seedClient, { casing: 'snake_case' })
  console.log('Drizzle instance created:', db)
  return { client: seedClient, db }
}

// Enhanced sample data arrays
const majorNames = [
  'Computer Science',
  'Software Engineering',
  'Data Science',
  'Cybersecurity',
  'Business Administration',
  'Marketing',
  'Finance',
  'Economics',
  'Psychology',
  'Cognitive Science',
  'Mechanical Engineering',
  'Electrical Engineering',
  'Chemical Engineering',
  'Biomedical Engineering',
  'Civil Engineering',
  'Pre-Medicine',
  'Biology',
  'Biochemistry',
  'Neuroscience',
  'Public Health',
  'English Literature',
  'Creative Writing',
  'Journalism',
  'Communications',
  'Political Science',
  'International Relations',
  'Public Policy',
  'History',
  'Philosophy',
  'Art History',
  'Fine Arts',
  'Graphic Design',
  'Mathematics',
  'Statistics',
  'Physics',
  'Astronomy',
  'Chemistry',
  'Environmental Science',
  'Architecture',
  'Urban Planning',
]

const schoolData = [
  {
    name: 'Stanford University',
    domain: 'stanford.edu',
    location: 'Stanford, CA',
    image: 'https://images.unsplash.com/photo-1562774053-701939374585?w=400&h=300&fit=crop',
  },
  {
    name: 'Harvard University',
    domain: 'harvard.edu',
    location: 'Cambridge, MA',
    image: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=400&h=300&fit=crop',
  },
  {
    name: 'MIT',
    domain: 'mit.edu',
    location: 'Cambridge, MA',
    image: 'https://images.unsplash.com/photo-1607237138185-eedd9c632b0b?w=400&h=300&fit=crop',
  },
  {
    name: 'UC Berkeley',
    domain: 'berkeley.edu',
    location: 'Berkeley, CA',
    image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=300&fit=crop',
  },
  {
    name: 'Yale University',
    domain: 'yale.edu',
    location: 'New Haven, CT',
    image: 'https://images.unsplash.com/photo-1564981797816-1043664bf78d?w=400&h=300&fit=crop',
  },
  {
    name: 'Princeton University',
    domain: 'princeton.edu',
    location: 'Princeton, NJ',
    image: 'https://images.unsplash.com/photo-1567168544813-cc03465b4fa8?w=400&h=300&fit=crop',
  },
  {
    name: 'Columbia University',
    domain: 'columbia.edu',
    location: 'New York, NY',
    image: 'https://images.unsplash.com/photo-1596496050827-8299e0220de1?w=400&h=300&fit=crop',
  },
  {
    name: 'University of Chicago',
    domain: 'uchicago.edu',
    location: 'Chicago, IL',
    image: 'https://images.unsplash.com/photo-1564981797816-1043664bf78d?w=400&h=300&fit=crop',
  },
  {
    name: 'New York University',
    domain: 'nyu.edu',
    location: 'New York, NY',
    image: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=400&h=300&fit=crop',
  },
  {
    name: 'UCLA',
    domain: 'ucla.edu',
    location: 'Los Angeles, CA',
    image: 'https://images.unsplash.com/photo-1562774053-701939374585?w=400&h=300&fit=crop',
  },
  {
    name: 'University of Michigan',
    domain: 'umich.edu',
    location: 'Ann Arbor, MI',
    image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=300&fit=crop',
  },
  {
    name: 'Carnegie Mellon University',
    domain: 'cmu.edu',
    location: 'Pittsburgh, PA',
    image: 'https://images.unsplash.com/photo-1607237138185-eedd9c632b0b?w=400&h=300&fit=crop',
  },
  {
    name: 'Georgia Institute of Technology',
    domain: 'gatech.edu',
    location: 'Atlanta, GA',
    image: 'https://images.unsplash.com/photo-1567168544813-cc03465b4fa8?w=400&h=300&fit=crop',
  },
  {
    name: 'University of Texas at Austin',
    domain: 'utexas.edu',
    location: 'Austin, TX',
    image: 'https://images.unsplash.com/photo-1596496050827-8299e0220de1?w=400&h=300&fit=crop',
  },
  {
    name: 'Duke University',
    domain: 'duke.edu',
    location: 'Durham, NC',
    image: 'https://images.unsplash.com/photo-1564981797816-1043664bf78d?w=400&h=300&fit=crop',
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
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&h=150&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=150&h=150&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=150&h=150&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&h=150&fit=crop&crop=face',
]

const schoolYears = ['Freshman', 'Sophomore', 'Junior', 'Senior', 'Graduate'] as const

const firstName = [
  'Alex',
  'Jordan',
  'Taylor',
  'Casey',
  'Morgan',
  'Riley',
  'Avery',
  'Quinn',
  'Sage',
  'River',
  'Emma',
  'Liam',
  'Olivia',
  'Noah',
  'Ava',
  'Ethan',
  'Sophia',
  'Mason',
  'Isabella',
  'William',
  'Mia',
  'James',
  'Charlotte',
  'Benjamin',
  'Amelia',
  'Lucas',
  'Harper',
  'Henry',
  'Evelyn',
  'Alexander',
  'Abigail',
  'Michael',
  'Emily',
  'Daniel',
  'Elizabeth',
  'Jacob',
  'Sofia',
  'Logan',
  'Madison',
  'Jackson',
  'Scarlett',
  'David',
  'Victoria',
  'Owen',
  'Aria',
  'Matthew',
  'Grace',
  'Wyatt',
  'Chloe',
  'Aiden',
]

const lastName = [
  'Smith',
  'Johnson',
  'Williams',
  'Brown',
  'Jones',
  'Garcia',
  'Miller',
  'Davis',
  'Rodriguez',
  'Martinez',
  'Hernandez',
  'Lopez',
  'Gonzalez',
  'Wilson',
  'Anderson',
  'Thomas',
  'Taylor',
  'Moore',
  'Jackson',
  'Martin',
  'Lee',
  'Perez',
  'Thompson',
  'White',
  'Harris',
  'Sanchez',
  'Clark',
  'Ramirez',
  'Lewis',
  'Robinson',
  'Walker',
  'Young',
  'Allen',
  'King',
  'Wright',
  'Scott',
  'Torres',
  'Nguyen',
  'Hill',
  'Flores',
  'Green',
  'Adams',
  'Nelson',
  'Baker',
  'Hall',
  'Rivera',
  'Campbell',
  'Mitchell',
  'Carter',
  'Roberts',
]

const userBios = [
  'Passionate about AI and machine learning. Currently working on computer vision projects and exploring the intersection of technology and healthcare. Love hiking and photography in my free time.',
  'Pre-med student with a focus on pediatrics. Volunteer at local hospitals and participate in medical mission trips. Interested in global health disparities and healthcare accessibility.',
  'Business major with an entrepreneurial mindset. Co-founded a sustainable fashion startup and love connecting with like-minded innovators. Always looking for the next big opportunity.',
  'Psychology student fascinated by human behavior and mental health advocacy. Research assistant in cognitive psychology lab. Passionate about making mental health resources more accessible.',
  'Engineering student specializing in renewable energy systems. Part of the solar car team and actively involved in sustainability initiatives on campus. Future goal: climate tech startup.',
  'English literature major with a love for creative writing. Editor of the campus literary magazine and aspiring novelist. Believe in the power of storytelling to create change.',
  'Economics student interested in behavioral economics and public policy. Intern at a think tank focused on education reform. Dream of working in government to make systemic change.',
  'Computer science student with a passion for cybersecurity. Member of the ethical hacking club and volunteer teaching coding to underrepresented youth. Interested in digital privacy rights.',
  'Biology major on the pre-vet track. Work at an animal rescue and volunteer at the campus veterinary clinic. Passionate about animal welfare and wildlife conservation.',
  'Art history major with a focus on contemporary art and museum studies. Intern at a local gallery and aspiring curator. Love exploring the cultural significance of visual art.',
  'Mathematics major interested in cryptography and number theory. Tutor for calculus and participate in math competitions. Plan to pursue a PhD in pure mathematics.',
  'Philosophy major exploring ethics and political philosophy. Debate team captain and involved in social justice advocacy. Interested in law school and public interest law.',
  'International relations major with focus on conflict resolution. Study abroad experience in three countries. Fluent in four languages and passionate about diplomacy.',
  'Environmental science major working on climate change research. Leader of campus sustainability club and organizer of Earth Day events. Committed to environmental justice.',
  'Finance major with interest in sustainable investing. Treasurer of investment club and intern at impact investing firm. Want to align financial success with social good.',
  'Data science major working on machine learning applications in healthcare. Research assistant analyzing medical imaging data. Excited about the potential of AI in medicine.',
  'Communications major specializing in digital marketing and social media strategy. Run a successful lifestyle blog and freelance for small businesses. Love creative content creation.',
  'Chemical engineering major interested in pharmaceutical development. Work in a drug discovery lab and volunteer with patients in clinical trials. Goal: develop life-saving medications.',
  'Political science major with focus on voting rights and democracy. Intern with voter registration organizations and campus political advocacy groups. Plan to work in campaign management.',
  'Architecture major passionate about sustainable design and urban planning. Part of design competition teams and volunteer with Habitat for Humanity. Dream of creating equitable housing.',
]

const postTitles = [
  'From Community College to Ivy League: My Transfer Journey',
  'Landing My Dream Internship at a Fortune 500 Company',
  "How I Built a Successful Study Group That Raised Everyone's GPA",
  'Dealing with Imposter Syndrome in STEM Fields',
  'My Experience as a First-Generation College Student',
  'How to Network Effectively as an Introvert',
  'Balancing Pre-Med Requirements with Mental Health',
  'Starting a Successful Campus Organization from Scratch',
  'How Study Abroad Changed My Career Perspective',
  'The Reality of Being a Student Entrepreneur',
  'Transitioning from Online to In-Person Learning',
  'How to Make the Most of Research Opportunities',
  "Finding Your Passion When You're Undecided",
  'The Importance of Mentorship in College Success',
  'How I Overcame Academic Probation and Graduated Magna Cum Laude',
  'Building Meaningful Relationships with Professors',
  'My Experience with Diversity and Inclusion on Campus',
  'How to Prepare for Graduate School Applications',
  'The Art of Effective Time Management in College',
  'How I Found My Voice Through Campus Activism',
  'Navigating Roommate Conflicts and Building Friendships',
  'The Financial Reality of College: Budgeting Tips That Work',
  'How to Turn Your Hobby into a Career',
  'Dealing with Family Expectations vs. Personal Goals',
  'My Journey Through Multiple Major Changes',
  'How to Build a Professional Network Before Graduation',
  'The Power of Failure: What My Biggest Setbacks Taught Me',
  'How to Excel in Group Projects and Team Environments',
  'Finding Work-Life Balance as a High Achiever',
  'How I Used Campus Resources to Land My Dream Job',
  'The Reality of Being a Minority in STEM',
  'How to Make College Affordable: Scholarships and Financial Aid',
  'Building Confidence Through Public Speaking',
  'How to Choose Between Graduate School and Job Opportunities',
  'The Importance of Self-Care During Finals Season',
  'How I Started a Successful Tutoring Business',
  'Navigating Internship Applications and Interviews',
  'The Benefits of Taking Gap Years',
  'How to Build a Portfolio That Stands Out',
  'My Experience with Alternative Learning Styles',
]

const postDescriptions = [
  "The path from community college to an Ivy League school taught me resilience, determination, and the value of every opportunity. Here's my complete strategy and timeline.",
  'After 50+ applications and countless rejections, I finally landed my dream internship. Here are the exact steps I took and what I learned from each failure.',
  "Our study group went from struggling individually to all earning A's in organic chemistry. Here's the framework we used that you can replicate in any subject.",
  "Imposter syndrome hit me hardest when I was the only woman in my computer science classes. Here's how I learned to recognize it and develop coping strategies.",
  'Being first-gen means navigating college without a roadmap. Here are the resources, mentors, and strategies that helped me succeed against the odds.',
  "Networking events terrified me, but I discovered that introverts have unique networking superpowers. Here's how to leverage your listening skills and build authentic connections.",
  "The pressure of pre-med requirements took a toll on my mental health. Here's how I learned to prioritize both my GPA and my wellbeing without compromising either.",
  'Starting our mental health advocacy group from zero members to 500+ taught me valuable lessons about leadership, persistence, and creating real change on campus.',
  "Six months in Barcelona didn't just improve my Spanish—it completely shifted my career goals and life perspective. Here's what I wish I knew before going abroad.",
  "Running a startup while juggling coursework is challenging but possible. Here's my honest take on the realities, failures, and unexpected lessons learned.",
  'After 18 months of online learning, returning to campus felt overwhelming. Here are the strategies that helped me readjust and thrive in person again.',
  "Research opportunities seemed impossible to get as an undergrad, but I learned the right approach. Here's how to find projects, impress professors, and make meaningful contributions.",
  "Being 'undecided' felt like falling behind, but it led me to discover my true passion. Here's how I used exploration strategically to find my path.",
  "My mentor changed my entire college trajectory. Here's how I found amazing mentors and how to build relationships that benefit everyone involved.",
  'Academic probation was my wake-up call. The journey back to academic success taught me study strategies, self-advocacy, and resilience I use every day.',
  "Your professors want to see you succeed, but many students don't know how to build those relationships. Here's my guide to meaningful academic mentorship.",
  "Joining diversity organizations on campus opened doors I never expected and connected me with a community that understood my experience. Here's why representation matters.",
  "Graduate school applications are overwhelming, but breaking them down systematically makes them manageable. Here's my timeline and strategy for competitive programs.",
  'Time management in college is different from high school. Here are the systems that helped me balance academics, extracurriculars, and personal life successfully.',
  "Campus activism taught me that students have real power to create change. Here's how I found my voice and made a tangible impact on important issues.",
  "Roommate drama can make or break your college experience. Here's how I navigated conflicts, set boundaries, and built lasting friendships in the dorms.",
  'College is expensive, but strategic planning can reduce the financial burden significantly. Here are the budgeting strategies and resources that saved me thousands.',
  "My photography hobby became my career path through strategic planning and networking. Here's how to identify marketable skills in your passions.",
  "Family pressure to pursue pre-med clashed with my passion for art. Here's how I navigated this difficult conversation and found a path that honored both.",
  "I changed majors three times before finding my calling. Here's what each change taught me and how to know when it's time to pivot.",
  "Building a network before graduation gave me a huge advantage in the job market. Here's how to start early and maintain relationships authentically.",
  "My biggest failures in college—bombing presentations, losing leadership positions—became my greatest teachers. Here's how to reframe setbacks as growth opportunities.",
  "Group projects don't have to be nightmares. Here are the leadership and collaboration strategies that turn dysfunctional teams into high-performing ones.",
  "Being a perfectionist nearly burned me out completely. Here's how I learned to maintain high standards while prioritizing my mental health and relationships.",
  "Campus career services seemed useless until I learned how to use them effectively. Here's how to maximize these resources and get personalized support.",
  "Being one of few people of color in my engineering program was isolating until I found my community. Here's how I navigated this challenge and created support systems.",
  "Financial aid and scholarships made my education possible. Here's my comprehensive guide to finding and applying for funding, including lesser-known opportunities.",
  "Public speaking terrified me, but I knew it was essential for my career. Here's how I went from panic attacks to confident presentations through gradual exposure.",
  "Choosing between graduate school and a job offer was agonizing. Here's the framework I used to make this decision and why timing matters more than you think.",
  'Finals season used to destroy my mental health until I developed a sustainable self-care routine. Here are practical strategies that actually work during high-stress periods.',
  "My tutoring business started as a way to earn extra money but became a fulfilling entrepreneurial experience. Here's how to turn academic strengths into income.",
  "Internship applications felt impossible until I learned what recruiters actually want to see. Here's my step-by-step guide to standing out in a competitive field.",
  "Taking a gap year was the best decision I made, despite pressure to go straight to college. Here's how gap years can enhance rather than delay your path.",
  "A strong portfolio opened doors that my GPA alone couldn't. Here's how to create compelling work samples regardless of your field or experience level.",
  "Learning differently in a traditional education system was challenging, but I found strategies that work. Here's how to advocate for yourself and find your optimal learning style.",
]

const mentorReviewComments = [
  'Incredible mentor! Their guidance helped me land my dream internship. Always responsive and genuinely cares about student success.',
  'Amazing experience. They provided practical advice for navigating pre-med requirements and shared valuable insights about medical school applications.',
  'So grateful for their mentorship. They helped me switch majors with confidence and provided excellent career guidance throughout the process.',
  'Fantastic mentor who really understands the entrepreneurship journey. Their network connections and startup advice were invaluable.',
  'They provided excellent guidance for graduate school applications. Their feedback on my personal statement made a huge difference.',
  'Wonderful mentor who helped me develop confidence in technical interviews. Their mock interview sessions were incredibly helpful.',
  'Great experience overall. They shared practical tips for work-life balance and helped me navigate my first professional job.',
  "Outstanding mentor! They helped me overcome imposter syndrome and develop leadership skills I didn't know I had.",
  'Very knowledgeable about the finance industry. Their career advice and networking tips were spot-on and actionable.',
  'Excellent mentor who provided valuable insights into the research world. Helped me secure my first research position.',
  'Amazing support throughout my college journey. They helped me develop study strategies that significantly improved my grades.',
  'Fantastic mentor for anyone interested in tech. Their industry insights and interview preparation were incredibly valuable.',
  'Great experience! They helped me navigate difficult family expectations while staying true to my own goals and interests.',
  'Wonderful mentorship experience. They provided excellent guidance for building a professional network and finding opportunities.',
  'Outstanding mentor who helped me develop public speaking skills and confidence. Their feedback was always constructive and encouraging.',
  'Very helpful for understanding the realities of graduate student life. Their advice helped me make an informed decision about my future.',
  'Excellent mentor who provided practical advice for managing academic stress and maintaining mental health during challenging times.',
  "Great experience overall. They helped me explore different career paths and discover opportunities I hadn't considered before.",
  'Fantastic mentor who provided valuable insights into the consulting industry. Their case interview preparation was extremely helpful.',
  'Amazing support for navigating diversity challenges in STEM. They helped me find my voice and build confidence in academic settings.',
  'Excellent mentor who helped me develop project management skills and learn to work effectively in team environments.',
  'Great experience! They provided practical advice for building a strong portfolio and showcasing skills to potential employers.',
  'Wonderful mentor who helped me navigate the transition from college to professional life. Their insights were incredibly valuable.',
  'Outstanding mentorship experience. They helped me develop research skills and think critically about complex academic questions.',
  'Very knowledgeable about the nonprofit sector. Their advice helped me find meaningful volunteer opportunities and career paths.',
]

const waitlistEmails = [
  'sarah.chen@gmail.com',
  'michael.rodriguez@yahoo.com',
  'amanda.johnson@outlook.com',
  'david.kim@gmail.com',
  'jessica.martinez@hotmail.com',
  'ryan.thompson@gmail.com',
  'emily.wilson@yahoo.com',
  'jonathan.lee@outlook.com',
  'samantha.brown@gmail.com',
  'kevin.garcia@yahoo.com',
  'michelle.davis@gmail.com',
  'brandon.miller@outlook.com',
  'nicole.anderson@gmail.com',
  'tyler.moore@yahoo.com',
  'stephanie.taylor@gmail.com',
  'joshua.jackson@outlook.com',
  'rachel.white@gmail.com',
  'nathan.harris@yahoo.com',
  'lauren.clark@gmail.com',
  'austin.lewis@outlook.com',
  'megan.walker@gmail.com',
  'sean.hall@yahoo.com',
  'brittany.young@gmail.com',
  'connor.allen@outlook.com',
  'vanessa.king@gmail.com',
  'student.prospect1@university.edu',
  'future.mentee@college.edu',
  'aspiring.engineer@tech.edu',
  'pre.med.student@medical.edu',
  'business.student@commerce.edu',
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
    const first = getRandomElement(firstName)
    const last = getRandomElement(lastName)
    const name = `${first} ${last}`
    const email = `${first.toLowerCase()}.${last.toLowerCase()}${i + 1}@university.edu`

    users.push({
      name,
      email,
      image: getRandomElement(userImages),
    })
  }
  return users
}

const generateGraduationYear = (schoolYear: string): number => {
  const currentYear = new Date().getFullYear()
  const baseYear = currentYear + 1 // Most people graduate after current academic year

  switch (schoolYear) {
    case 'Freshman':
      return baseYear + 3
    case 'Sophomore':
      return baseYear + 2
    case 'Junior':
      return baseYear + 1
    case 'Senior':
      return baseYear
    case 'Graduate':
      return baseYear + Math.floor(Math.random() * 3) + 1 // 1-4 years for grad programs
    default:
      return baseYear
  }
}

export const seedDatabase = async (environment?: Environment) => {
  const targetEnv = environment

  // Safety check: don't allow seeding production
  if (targetEnv === 'production') {
    throw new Error('❌ Seeding is not allowed in production environment for safety')
  }

  console.log(`🌱 Starting database seeding for environment: ${targetEnv}`)

  const { client, db } = createSeedConnection(environment)

  try {
    // Use transaction for atomic seeding - rollback everything if any step fails
    await db.transaction(async tx => {
      console.log('🔄 Starting database transaction...')

      // Step 1: Insert majors
      console.log('📚 Inserting majors...')
      const insertedMajors = await tx
        .insert(majors)
        .values(majorNames.map(name => ({ name })))
        .returning()

      // Step 2: Insert schools
      console.log('🏫 Inserting schools...')
      const insertedSchools = await tx.insert(schools).values(schoolData).returning()

      // Step 3: Insert mentor users only (all users will have Cal.com accounts)
      console.log('👥 Inserting mentor users...')
      const userData = generateUserData(30) // Only create mentors
      const insertedUsers = await tx.insert(users).values(userData).returning()

      // Step 4: Insert user profiles
      console.log('📋 Inserting user profiles...')
      const userProfileData = insertedUsers.map((user, index) => {
        const schoolYear = getRandomElement(schoolYears)
        const graduationYear = generateGraduationYear(schoolYear)
        const bioIndex = index % userBios.length

        return {
          userId: user.id,
          bio: userBios[bioIndex],
          schoolYear,
          graduationYear,
        }
      })
      await tx.insert(userProfiles).values(userProfileData)

      // Step 5: Insert user majors (each user gets 1-2 majors)
      console.log('🎓 Inserting user majors...')
      const userMajorData = []
      for (const user of insertedUsers) {
        const numMajors = Math.random() > 0.7 ? 2 : 1 // 30% chance of double major
        const selectedMajors = getRandomElements(insertedMajors, numMajors)

        for (const major of selectedMajors) {
          userMajorData.push({
            userId: user.id,
            majorId: major.id,
          })
        }
      }
      await tx.insert(userMajors).values(userMajorData)

      // Step 6: Insert user schools (each user gets one school)
      console.log('🏛️ Inserting user schools...')
      const userSchoolData = insertedUsers.map(user => ({
        userId: user.id,
        schoolId: getRandomElement(insertedSchools).id,
      }))
      await tx.insert(userSchools).values(userSchoolData)

      // Step 7: Insert posts (all users get exactly one post)
      console.log('📝 Inserting posts...')
      const postingUsers = insertedUsers // All users get exactly one post
      const selectedTitles = getRandomElements(postTitles, postingUsers.length)
      const selectedDescriptions = getRandomElements(postDescriptions, postingUsers.length)

      const postData = postingUsers.map((user, index) => ({
        name: selectedTitles[index],
        description: selectedDescriptions[index],
        createdById: user.id,
      }))
      await tx.insert(posts).values(postData)

      // Step 8: Insert mentor reviews (all users are mentors, so they all get reviews)
      console.log('⭐ Inserting mentor reviews...')
      const mentors = insertedUsers // All users are mentors
      const reviewData = []

      for (const mentor of mentors) {
        // Each mentor gets 2-8 reviews from other mentors
        const numReviews = Math.floor(Math.random() * 7) + 2
        const reviewers = getRandomElements(
          insertedUsers.filter(u => u.id !== mentor.id),
          Math.min(numReviews, insertedUsers.length - 1)
        )

        for (const reviewer of reviewers) {
          const rating =
            Math.random() > 0.1
              ? Math.random() > 0.3
                ? 5
                : 4 // 70% get 5 stars, 20% get 4 stars
              : Math.floor(Math.random() * 3) + 3 // 10% get 3, 2, or 1 stars

          reviewData.push({
            mentorId: mentor.id,
            userId: reviewer.id,
            rating,
            review: getRandomElement(mentorReviewComments),
          })
        }
      }
      await tx.insert(mentorReviews).values(reviewData)

      // Step 9: Create Cal.com managed users and add them to college-mentors team
      console.log('🌐 Creating Cal.com managed users and adding to college-mentors team...')
      const calcomApiBase = process.env.NEXT_PUBLIC_CALCOM_API_URL
      const calcomClientId = process.env.NEXT_PUBLIC_X_CAL_ID
      const calcomSecretKey = process.env.X_CAL_SECRET_KEY
      const calcomOrgId = process.env.CALCOM_ORG_ID
      const collegeMentorTeamId = process.env.COLLEGE_MENTOR_TEAM_ID
      if (!calcomClientId || !calcomSecretKey || !calcomOrgId || !collegeMentorTeamId) {
        throw new Error(
          'Missing Cal.com credentials: NEXT_PUBLIC_X_CAL_ID, X_CAL_SECRET_KEY, CALCOM_ORG_ID, and/or COLLEGE_MENTOR_TEAM_ID'
        )
      }
      const calcomTokenData: Array<{
        userId: string
        calcomUserId: number
        calcomUsername: string
        accessToken: string
        refreshToken: string
        accessTokenExpiresAt: Date
        refreshTokenExpiresAt: Date
      }> = []

      for (const mentor of mentors) {
        try {
          // Step 9a: Create Cal.com managed user
          const userResponse = await fetch(
            `${calcomApiBase}/oauth-clients/${calcomClientId}/users`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-cal-secret-key': calcomSecretKey,
              },
              body: JSON.stringify({
                email: mentor.email,
                name: mentor.name ?? '',
                timeFormat: 12,
                weekStart: 'Monday',
                timeZone: 'UTC',
                locale: 'en',
                avatarUrl: mentor.image ?? undefined,
                bio: '',
                metadata: {},
              }),
            }
          )

          if (!userResponse.ok) {
            const errText = await userResponse.text()
            throw new Error(
              `Failed to create Cal.com user for ${mentor.email}: ${userResponse.status} ${errText}`
            )
          }

          const userJson = await userResponse.json()
          const {
            accessToken,
            refreshToken,
            accessTokenExpiresAt,
            refreshTokenExpiresAt,
            user: calUser,
          } = userJson.data

          // Step 9b: Add user to college-mentors team
          const membershipResponse = await fetch(
            `${calcomApiBase}/organizations/${calcomOrgId}/teams/${collegeMentorTeamId}/memberships`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-cal-secret-key': calcomSecretKey,
                'x-cal-client-id': calcomClientId,
              },
              body: JSON.stringify({
                role: 'MEMBER',
                accepted: true,
                disableImpersonation: false,
                userId: calUser.id,
              }),
            }
          )

          if (!membershipResponse.ok) {
            const membershipErrorText = await membershipResponse.text()
            console.error(
              `Failed to add user ${calUser.id} to college-mentors team: ${membershipResponse.status} ${membershipErrorText}`
            )
            // Continue anyway - user is created even if team membership fails
          } else {
            const membershipData = await membershipResponse.json()
            console.log(`Successfully added user ${calUser.id} to college-mentors team`)
            console.log('Team membership data:', membershipData)
          }

          calcomTokenData.push({
            userId: mentor.id,
            calcomUserId: calUser.id,
            calcomUsername: calUser.username,
            accessToken,
            refreshToken,
            accessTokenExpiresAt: new Date(accessTokenExpiresAt),
            refreshTokenExpiresAt: new Date(refreshTokenExpiresAt),
          })
        } catch (error) {
          console.error(`Error processing mentor ${mentor.email}:`, error)
        }
      }

      if (calcomTokenData.length > 0) {
        console.log('📑 Inserting Cal.com tokens into DB...')
        await tx.insert(calcomTokens).values(calcomTokenData)
      }

      // Note: Event types are now managed at the team level instead of per-user
      console.log('✅ Cal.com users created and added to college-mentors team')
      console.log('   Event types will be managed at the team level, not per-user')

      // Step 11: Insert waitlist entries
      console.log('📧 Inserting waitlist entries...')
      const waitlistData = waitlistEmails.map(email => ({ email }))
      await tx.insert(waitlist).values(waitlistData)

      console.log('✅ Transaction completed successfully!')

      // Return data for final summary
      return {
        insertedUsers,
        postData,
        reviewData,
        waitlistData,
      }
    })

    console.log('🎉 Database seeding completed successfully!')
    console.log('📊 Generated comprehensive realistic data including:')
    console.log(`  - 30 mentor users with detailed profiles (all added to college-mentors team)`)
    console.log(`  - Posts with engaging content for all users`)
    console.log(`  - ${majorNames.length} majors and ${schoolData.length} schools`)
    console.log(`  - Mentor reviews with ratings for all users`)
    console.log(`  - Waitlist entries`)
    console.log('  - Complete relationship mappings between all entities')
    console.log('  - Realistic graduation years based on school year')
    console.log('  - Diverse bio content and user backgrounds')
    console.log('  - Cal.com managed users added to college-mentors team')
    console.log('  - Event types managed at team level (not per-user)')
  } catch (error) {
    console.error(`❌ Seeding failed for ${targetEnv}:`, error)
    console.error('🔄 Transaction automatically rolled back')
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
