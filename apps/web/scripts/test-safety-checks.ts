#!/usr/bin/env tsx

/**
 * Safety Check Test Script
 *
 * This script tests that your environment safety checks are working properly
 * to prevent accidental operations on the wrong database.
 *
 * Usage:
 *   tsx scripts/test-safety-checks.ts
 */

import { spawn } from 'child_process'

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
}

interface TestResult {
  name: string
  passed: boolean
  message: string
}

const runCommand = (
  command: string,
  args: string[]
): Promise<{ stdout: string; stderr: string; exitCode: number }> => {
  return new Promise(resolve => {
    const child = spawn(command, args, { stdio: 'pipe' })

    let stdout = ''
    let stderr = ''

    child.stdout.on('data', data => {
      stdout += data.toString()
    })

    child.stderr.on('data', data => {
      stderr += data.toString()
    })

    child.on('close', exitCode => {
      resolve({ stdout, stderr, exitCode: exitCode ?? 0 })
    })
  })
}

const tests: Array<() => Promise<TestResult>> = [
  // Test 1: Seed script rejects production
  async () => {
    const result = await runCommand('tsx', ['scripts/db-seed.ts', 'production'])
    const passed =
      result.exitCode !== 0 &&
      (result.stderr.includes('production not allowed') ||
        result.stdout.includes('production not allowed'))

    return {
      name: 'Seed script rejects production environment',
      passed,
      message: passed
        ? 'Production seeding correctly blocked'
        : 'DANGER: Production seeding was not blocked!',
    }
  },

  // Test 2: Reset script rejects production
  async () => {
    const result = await runCommand('tsx', ['scripts/db-reset.ts', 'production'])
    const passed =
      result.exitCode !== 0 &&
      (result.stderr.includes('production') || result.stdout.includes('production'))

    return {
      name: 'Reset script rejects production environment',
      passed,
      message: passed
        ? 'Production reset correctly blocked'
        : 'DANGER: Production reset was not blocked!',
    }
  },

  // Test 3: Seed script requires environment parameter
  async () => {
    const result = await runCommand('tsx', ['scripts/db-seed.ts'])
    const passed =
      result.exitCode !== 0 &&
      (result.stderr.includes('Environment is required') ||
        result.stdout.includes('Environment is required'))

    return {
      name: 'Seed script requires environment parameter',
      passed,
      message: passed
        ? 'Environment parameter requirement working'
        : 'DANGER: Scripts can run without environment specified!',
    }
  },

  // Test 4: Reset script requires environment parameter
  async () => {
    const result = await runCommand('tsx', ['scripts/db-reset.ts'])
    const passed =
      result.exitCode !== 0 &&
      (result.stderr.includes('Environment is required') ||
        result.stdout.includes('Environment is required'))

    return {
      name: 'Reset script requires environment parameter',
      passed,
      message: passed
        ? 'Environment parameter requirement working'
        : 'DANGER: Scripts can run without environment specified!',
    }
  },

  // Test 5: Invalid environment rejection
  async () => {
    const result = await runCommand('tsx', ['scripts/db-seed.ts', 'invalid'])
    const passed =
      result.exitCode !== 0 &&
      (result.stderr.includes('Invalid environment') ||
        result.stdout.includes('Invalid environment'))

    return {
      name: 'Scripts reject invalid environment names',
      passed,
      message: passed
        ? 'Invalid environment names correctly rejected'
        : 'DANGER: Invalid environments not properly rejected!',
    }
  },
]

const runSafetyTests = async () => {
  console.log(`${colors.bold}${colors.blue}🛡️  Database Safety Check Tests${colors.reset}`)
  console.log('─'.repeat(60))
  console.log('Testing that your safety mechanisms prevent dangerous operations...')
  console.log('─'.repeat(60))

  const results: TestResult[] = []

  for (let i = 0; i < tests.length; i++) {
    const test = tests[i]
    console.log(`${colors.blue}Running test ${i + 1}/${tests.length}...${colors.reset}`)
    try {
      if (!test) {
        throw new Error('Test function is undefined')
      }
      const result = await test()
      results.push(result)

      const status = result.passed
        ? `${colors.green}✅ PASS${colors.reset}`
        : `${colors.red}❌ FAIL${colors.reset}`

      console.log(`${status} ${result.name}`)
      console.log(`   ${result.message}`)
    } catch (error) {
      results.push({
        name: `Test ${i + 1}`,
        passed: false,
        message: `Test failed with error: ${error}`,
      })
      console.log(`${colors.red}❌ ERROR${colors.reset} Test ${i + 1} failed with error`)
    }

    console.log('')
  }

  // Summary
  console.log('─'.repeat(60))
  const passed = results.filter(r => r.passed).length
  const total = results.length

  if (passed === total) {
    console.log(
      `${colors.green}${colors.bold}🎉 ALL SAFETY CHECKS PASSED! (${passed}/${total})${colors.reset}`
    )
    console.log(
      `${colors.green}Your database is protected from accidental operations.${colors.reset}`
    )
  } else {
    console.log(
      `${colors.red}${colors.bold}⚠️  SAFETY ISSUES DETECTED! (${passed}/${total} passed)${colors.reset}`
    )
    console.log(
      `${colors.red}Please review and fix the failing safety checks before proceeding.${colors.reset}`
    )

    console.log(`\n${colors.yellow}Failed tests:${colors.reset}`)
    results
      .filter(r => !r.passed)
      .forEach(result => {
        console.log(`${colors.red}• ${result.name}${colors.reset}`)
        console.log(`  ${result.message}`)
      })
  }

  console.log('─'.repeat(60))

  // Exit with appropriate code
  process.exit(passed === total ? 0 : 1)
}

// Run tests
runSafetyTests().catch(error => {
  console.error(`${colors.red}Safety test runner failed:${colors.reset}`, error)
  process.exit(1)
})
