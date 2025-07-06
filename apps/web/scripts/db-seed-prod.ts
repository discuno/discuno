#!/usr/bin/env tsx

/**
 * Production seed script: insert schools and majors into the production database
 */

import { config } from 'dotenv'
import { sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

// Load production environment variables and override any already set
config({ path: '.env.production', override: true })

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  console.error('❌ DATABASE_URL not set in .env.production')
  process.exit(1)
}

async function main() {
  const client = postgres(databaseUrl ?? '', { max: 1, transform: postgres.camel })
  const db = drizzle(client)

  // Schools to seed
  const schoolsData = [
    {
      name: 'Harvard University',
      domain: 'harvard.edu',
      location: 'Cambridge, MA',
      image: 'https://placeholder.com/harvard.png',
    },
    {
      name: 'Stanford University',
      domain: 'stanford.edu',
      location: 'Stanford, CA',
      image: 'https://placeholder.com/stanford.png',
    },
    {
      name: 'Massachusetts Institute of Technology',
      domain: 'mit.edu',
      location: 'Cambridge, MA',
      image: 'https://placeholder.com/mit.png',
    },
    {
      name: 'California Institute of Technology',
      domain: 'caltech.edu',
      location: 'Pasadena, CA',
      image: 'https://placeholder.com/caltech.png',
    },
    {
      name: 'University of Chicago',
      domain: 'uchicago.edu',
      location: 'Chicago, IL',
      image: 'https://placeholder.com/uchicago.png',
    },
    {
      name: 'Princeton University',
      domain: 'princeton.edu',
      location: 'Princeton, NJ',
      image: 'https://placeholder.com/princeton.png',
    },
    {
      name: 'Cornell University',
      domain: 'cornell.edu',
      location: 'Ithaca, NY',
      image: 'https://placeholder.com/cornell.png',
    },
    {
      name: 'University of Pennsylvania',
      domain: 'upenn.edu',
      location: 'Philadelphia, PA',
      image: 'https://placeholder.com/upenn.png',
    },
    {
      name: 'Yale University',
      domain: 'yale.edu',
      location: 'New Haven, CT',
      image: 'https://placeholder.com/yale.png',
    },
    {
      name: 'Columbia University',
      domain: 'columbia.edu',
      location: 'New York, NY',
      image: 'https://placeholder.com/columbia.png',
    },
    {
      name: 'University of Michigan',
      domain: 'umich.edu',
      location: 'Ann Arbor, MI',
      image: 'https://placeholder.com/umich.png',
    },
    {
      name: 'Johns Hopkins University',
      domain: 'jhu.edu',
      location: 'Baltimore, MD',
      image: 'https://placeholder.com/jhu.png',
    },
    {
      name: 'Duke University',
      domain: 'duke.edu',
      location: 'Durham, NC',
      image: 'https://placeholder.com/duke.png',
    },
    {
      name: 'Northwestern University',
      domain: 'northwestern.edu',
      location: 'Evanston, IL',
      image: 'https://placeholder.com/northwestern.png',
    },
    {
      name: 'Brown University',
      domain: 'brown.edu',
      location: 'Providence, RI',
      image: 'https://placeholder.com/brown.png',
    },
    {
      name: 'Vanderbilt University',
      domain: 'vanderbilt.edu',
      location: 'Nashville, TN',
      image: 'https://placeholder.com/vanderbilt.png',
    },
    {
      name: 'Rice University',
      domain: 'rice.edu',
      location: 'Houston, TX',
      image: 'https://placeholder.com/rice.png',
    },
    {
      name: 'University of California, Berkeley',
      domain: 'berkeley.edu',
      location: 'Berkeley, CA',
      image: 'https://placeholder.com/berkeley.png',
    },
    {
      name: 'University of Southern California',
      domain: 'usc.edu',
      location: 'Los Angeles, CA',
      image: 'https://placeholder.com/usc.png',
    },
    {
      name: 'Pomona College',
      domain: 'pomona.edu',
      location: 'Claremont, CA',
      image: 'https://placeholder.com/pomona.png',
    },
    {
      name: 'University of Texas at Austin',
      domain: 'utexas.edu',
      location: 'Austin, TX',
      image: 'https://placeholder.com/utexas.png',
    },
    {
      name: 'University of North Carolina at Chapel Hill',
      domain: 'unc.edu',
      location: 'Chapel Hill, NC',
      image: 'https://placeholder.com/unc.png',
    },
    {
      name: 'University of Illinois Urbana-Champaign',
      domain: 'illinois.edu',
      location: 'Champaign, IL',
      image: 'https://placeholder.com/illinois.png',
    },
    {
      name: 'University of Wisconsin-Madison',
      domain: 'wisc.edu',
      location: 'Madison, WI',
      image: 'https://placeholder.com/wisc.png',
    },
    {
      name: 'University of Washington',
      domain: 'washington.edu',
      location: 'Seattle, WA',
      image: 'https://placeholder.com/washington.png',
    },
    {
      name: 'University of Florida',
      domain: 'ufl.edu',
      location: 'Gainesville, FL',
      image: 'https://placeholder.com/ufl.png',
    },
    {
      name: 'University of Maryland, College Park',
      domain: 'umd.edu',
      location: 'College Park, MD',
      image: 'https://placeholder.com/umd.png',
    },
    {
      name: 'Pennsylvania State University',
      domain: 'psu.edu',
      location: 'University Park, PA',
      image: 'https://placeholder.com/psu.png',
    },
    {
      name: 'Ohio State University',
      domain: 'osu.edu',
      location: 'Columbus, OH',
      image: 'https://placeholder.com/osu.png',
    },
    {
      name: 'Purdue University',
      domain: 'purdue.edu',
      location: 'West Lafayette, IN',
      image: 'https://placeholder.com/purdue.png',
    },
    {
      name: 'Texas A&M University',
      domain: 'tamu.edu',
      location: 'College Station, TX',
      image: 'https://placeholder.com/tamu.png',
    },
    {
      name: 'University of Minnesota',
      domain: 'umn.edu',
      location: 'Minneapolis, MN',
      image: 'https://placeholder.com/umn.png',
    },
    {
      name: 'University of Arizona',
      domain: 'arizona.edu',
      location: 'Tucson, AZ',
      image: 'https://placeholder.com/arizona.png',
    },
    {
      name: 'University of Colorado Boulder',
      domain: 'colorado.edu',
      location: 'Boulder, CO',
      image: 'https://placeholder.com/colorado.png',
    },
    {
      name: 'Boston University',
      domain: 'bu.edu',
      location: 'Boston, MA',
      image: 'https://placeholder.com/bu.png',
    },
    {
      name: 'University of Pittsburgh',
      domain: 'pitt.edu',
      location: 'Pittsburgh, PA',
      image: 'https://placeholder.com/pitt.png',
    },
    {
      name: 'Michigan State University',
      domain: 'msu.edu',
      location: 'East Lansing, MI',
      image: 'https://placeholder.com/msu.png',
    },
    {
      name: 'University of Notre Dame',
      domain: 'nd.edu',
      location: 'Notre Dame, IN',
      image: 'https://placeholder.com/nd.png',
    },
    {
      name: 'Washington University in St. Louis',
      domain: 'wustl.edu',
      location: 'St. Louis, MO',
      image: 'https://placeholder.com/wustl.png',
    },
    {
      name: 'New York University',
      domain: 'nyu.edu',
      location: 'New York, NY',
      image: 'https://placeholder.com/nyu.png',
    },
    {
      name: 'University of California, San Francisco',
      domain: 'ucsf.edu',
      location: 'San Francisco, CA',
      image: 'https://placeholder.com/ucsf.png',
    },
    {
      name: 'Case Western Reserve University',
      domain: 'case.edu',
      location: 'Cleveland, OH',
      image: 'https://placeholder.com/case.png',
    },
    {
      name: 'University of Rochester',
      domain: 'rochester.edu',
      location: 'Rochester, NY',
      image: 'https://placeholder.com/rochester.png',
    },
    {
      name: 'Tulane University',
      domain: 'tulane.edu',
      location: 'New Orleans, LA',
      image: 'https://placeholder.com/tulane.png',
    },
    {
      name: 'University of California, Los Angeles',
      domain: 'ucla.edu',
      location: 'Los Angeles, CA',
      image: 'https://placeholder.com/ucla.png',
    },
    {
      name: 'University of California, San Diego',
      domain: 'ucsd.edu',
      location: 'San Diego, CA',
      image: 'https://placeholder.com/ucsd.png',
    },
    {
      name: 'University of California, Santa Barbara',
      domain: 'ucsb.edu',
      location: 'Santa Barbara, CA',
      image: 'https://placeholder.com/ucsb.png',
    },
    {
      name: 'University of California, Irvine',
      domain: 'uci.edu',
      location: 'Irvine, CA',
      image: 'https://placeholder.com/uci.png',
    },
    {
      name: 'University of California, Davis',
      domain: 'ucdavis.edu',
      location: 'Davis, CA',
      image: 'https://placeholder.com/ucdavis.png',
    },
    {
      name: 'University of California, Santa Cruz',
      domain: 'ucsc.edu',
      location: 'Santa Cruz, CA',
      image: 'https://placeholder.com/ucsc.png',
    },
    {
      name: 'University of California, Riverside',
      domain: 'ucr.edu',
      location: 'Riverside, CA',
      image: 'https://placeholder.com/ucr.png',
    },
    {
      name: 'University of California, Merced',
      domain: 'ucmerced.edu',
      location: 'Merced, CA',
      image: 'https://placeholder.com/ucmerced.png',
    },
    {
      name: 'Boston College',
      domain: 'bc.edu',
      location: 'Chestnut Hill, MA',
      image: 'https://placeholder.com/bc.png',
    },
    {
      name: 'George Washington University',
      domain: 'gwu.edu',
      location: 'Washington, DC',
      image: 'https://placeholder.com/gwu.png',
    },
    {
      name: 'Emory University',
      domain: 'emory.edu',
      location: 'Atlanta, GA',
      image: 'https://placeholder.com/emory.png',
    },
    {
      name: 'Carnegie Mellon University',
      domain: 'cmu.edu',
      location: 'Pittsburgh, PA',
      image: 'https://placeholder.com/cmu.png',
    },
    {
      name: 'University of Virginia',
      domain: 'virginia.edu',
      location: 'Charlottesville, VA',
      image: 'https://placeholder.com/virginia.png',
    },
    {
      name: 'Georgia Institute of Technology',
      domain: 'gatech.edu',
      location: 'Atlanta, GA',
      image: 'https://placeholder.com/gatech.png',
    },
    {
      name: 'University of Miami',
      domain: 'miami.edu',
      location: 'Coral Gables, FL',
      image: 'https://placeholder.com/miami.png',
    },
    {
      name: 'University of Connecticut',
      domain: 'uconn.edu',
      location: 'Storrs, CT',
      image: 'https://placeholder.com/uconn.png',
    },
    {
      name: 'University of Utah',
      domain: 'utah.edu',
      location: 'Salt Lake City, UT',
      image: 'https://placeholder.com/utah.png',
    },
    {
      name: 'University of Missouri',
      domain: 'missouri.edu',
      location: 'Columbia, MO',
      image: 'https://placeholder.com/missouri.png',
    },
    {
      name: 'University of Tennessee, Knoxville',
      domain: 'utk.edu',
      location: 'Knoxville, TN',
      image: 'https://placeholder.com/utk.png',
    },
    {
      name: 'Iowa State University',
      domain: 'iastate.edu',
      location: 'Ames, IA',
      image: 'https://placeholder.com/iastate.png',
    },
    {
      name: 'Oregon State University',
      domain: 'oregonstate.edu',
      location: 'Corvallis, OR',
      image: 'https://placeholder.com/oregonstate.png',
    },
    {
      name: 'University of Nebraska–Lincoln',
      domain: 'unl.edu',
      location: 'Lincoln, NE',
      image: 'https://placeholder.com/unl.png',
    },
    {
      name: 'University of Kentucky',
      domain: 'uky.edu',
      location: 'Lexington, KY',
      image: 'https://placeholder.com/uky.png',
    },
    {
      name: 'University of Oklahoma',
      domain: 'ou.edu',
      location: 'Norman, OK',
      image: 'https://placeholder.com/ou.png',
    },
    {
      name: 'University of Arkansas',
      domain: 'uark.edu',
      location: 'Fayetteville, AR',
      image: 'https://placeholder.com/uark.png',
    },
    {
      name: 'University of New Mexico',
      domain: 'unm.edu',
      location: 'Albuquerque, NM',
      image: 'https://placeholder.com/unm.png',
    },
    {
      name: 'Kansas State University',
      domain: 'ksu.edu',
      location: 'Manhattan, KS',
      image: 'https://placeholder.com/ksu.png',
    },
    {
      name: 'Louisiana State University',
      domain: 'lsu.edu',
      location: 'Baton Rouge, LA',
      image: 'https://placeholder.com/lsu.png',
    },
    {
      name: 'University of Idaho',
      domain: 'uidaho.edu',
      location: 'Moscow, ID',
      image: 'https://placeholder.com/uidaho.png',
    },
    {
      name: 'University of Alaska Fairbanks',
      domain: 'uaf.edu',
      location: 'Fairbanks, AK',
      image: 'https://placeholder.com/uaf.png',
    },
    {
      name: 'University of Hawaii at Manoa',
      domain: 'manoa.hawaii.edu',
      location: 'Honolulu, HI',
      image: 'https://placeholder.com/hawaii.png',
    },
    {
      name: 'University of Montana',
      domain: 'umontana.edu',
      location: 'Missoula, MT',
      image: 'https://placeholder.com/umontana.png',
    },
    {
      name: 'University of Wyoming',
      domain: 'uwyo.edu',
      location: 'Laramie, WY',
      image: 'https://placeholder.com/uwyo.png',
    },
    {
      name: 'University of Nevada, Reno',
      domain: 'unr.edu',
      location: 'Reno, NV',
      image: 'https://placeholder.com/unr.png',
    },
    {
      name: 'University of Vermont',
      domain: 'uvm.edu',
      location: 'Burlington, VT',
      image: 'https://placeholder.com/uvm.png',
    },
    {
      name: 'University of New Hampshire',
      domain: 'unh.edu',
      location: 'Durham, NH',
      image: 'https://placeholder.com/unh.png',
    },
    {
      name: 'University of Maine',
      domain: 'maine.edu',
      location: 'Orono, ME',
      image: 'https://placeholder.com/maine.png',
    },
    {
      name: 'University of Massachusetts Amherst',
      domain: 'umass.edu',
      location: 'Amherst, MA',
      image: 'https://placeholder.com/umass.png',
    },
  ]

  // Majors to seed
  const majorsData = [
    { name: 'Computer Science' },
    { name: 'Electrical Engineering' },
    { name: 'Mechanical Engineering' },
    { name: 'Civil Engineering' },
    { name: 'Chemical Engineering' },
    { name: 'Biomedical Engineering' },
    { name: 'Biology' },
    { name: 'Chemistry' },
    { name: 'Physics' },
    { name: 'Mathematics' },
    { name: 'Statistics' },
    { name: 'Economics' },
    { name: 'Psychology' },
    { name: 'Sociology' },
    { name: 'Political Science' },
    { name: 'Business Administration' },
    { name: 'Finance' },
    { name: 'Marketing' },
    { name: 'Accounting' },
    { name: 'English' },
    { name: 'History' },
    { name: 'Philosophy' },
    { name: 'Nursing' },
    { name: 'Environmental Science' },
    { name: 'Data Science' },
    { name: 'Architecture' },
    { name: 'Education' },
    { name: 'Art' },
    { name: 'Music' },
    { name: 'Theater' },
  ]

  console.log('🔄 Seeding production database with schools and majors...')
  await db.transaction(async tx => {
    console.log('📚 Seeding schools...')
    for (const s of schoolsData) {
      await tx.execute(sql`
        INSERT INTO "discuno_school" ("name", "domain", "location", "image")
        VALUES (${s.name}, ${s.domain}, ${s.location}, ${s.image})
        ON CONFLICT ("domain") DO NOTHING;
      `)
    }

    console.log('🏷️ Seeding majors...')
    for (const m of majorsData) {
      await tx.execute(sql`
        INSERT INTO "discuno_major" ("name")
        VALUES (${m.name})
        ON CONFLICT ("name") DO NOTHING;
      `)
    }
  })

  console.log('✅ Production seed complete.')
  await client.end()
}

main().catch(err => {
  console.error('❌ Seed failed:', err)
  process.exit(1)
})
