import { vi } from 'vitest'

// Mock data types
export interface MockUser {
  id: string
  email: string
  name: string
  image?: string | null
}

export interface MockPost {
  id: number
  name: string
  description: string
  createdById: string
  createdAt: Date
}

export interface MockUserProfile {
  userId: string
  graduationYear?: number | null
  schoolYear?: string | null
}

export interface MockSchool {
  id: number
  name: string
}

export interface MockMajor {
  id: number
  name: string
}

export interface MockCalcomToken {
  userId: string
  calcomUserId: number
  calcomUsername: string
  accessToken: string
  refreshToken: string
  accessTokenExpiresAt: Date
  refreshTokenExpiresAt: Date
}

// Mock database class
export class MockDatabase {
  users: Map<string, MockUser> = new Map()
  posts: Map<number, MockPost> = new Map()
  userProfiles: Map<string, MockUserProfile> = new Map()
  schools: Map<number, MockSchool> = new Map()
  majors: Map<number, MockMajor> = new Map()
  userSchools: Map<string, number> = new Map() // userId -> schoolId
  userMajors: Map<string, number> = new Map() // userId -> majorId
  calcomTokens: Map<string, MockCalcomToken> = new Map()

  reset() {
    this.users.clear()
    this.posts.clear()
    this.userProfiles.clear()
    this.schools.clear()
    this.majors.clear()
    this.userSchools.clear()
    this.userMajors.clear()
    this.calcomTokens.clear()
  }

  // Mock query methods
  query = {
    schools: {
      findMany: vi.fn(() => Array.from(this.schools.values())),
    },
    majors: {
      findMany: vi.fn(() => Array.from(this.majors.values())),
    },
    users: {
      findFirst: vi.fn(),
    },
    userProfiles: {
      findFirst: vi.fn(),
    },
  }

  // Mock select/join operations
  select = vi.fn(() => ({
    from: vi.fn(() => ({
      leftJoin: vi.fn(() => ({
        leftJoin: vi.fn(() => ({
          leftJoin: vi.fn(() => ({
            leftJoin: vi.fn(() => ({
              leftJoin: vi.fn(() => ({
                leftJoin: vi.fn(() => ({
                  orderBy: vi.fn(() => ({
                    limit: vi.fn(() => ({
                      offset: vi.fn(() => ({
                        execute: vi.fn(),
                      })),
                    })),
                  })),
                  where: vi.fn(() => ({
                    limit: vi.fn(() => ({
                      execute: vi.fn(),
                    })),
                  })),
                  limit: vi.fn(() => ({
                    offset: vi.fn(() => ({
                      execute: vi.fn(),
                    })),
                  })),
                })),
              })),
            })),
          })),
        })),
      })),
    })),
  }))

  insert = vi.fn(() => ({
    into: vi.fn(() => ({
      values: vi.fn(() => ({
        execute: vi.fn(),
        onConflictDoUpdate: vi.fn(() => ({
          execute: vi.fn(),
        })),
      })),
    })),
  }))

  update = vi.fn(() => ({
    set: vi.fn(() => ({
      where: vi.fn(() => ({
        execute: vi.fn(),
      })),
    })),
  }))

  // Helper methods for testing
  addUser(user: MockUser) {
    this.users.set(user.id, user)
    return user
  }

  addPost(post: MockPost) {
    this.posts.set(post.id, post)
    return post
  }

  addSchool(school: MockSchool) {
    this.schools.set(school.id, school)
    return school
  }

  addMajor(major: MockMajor) {
    this.majors.set(major.id, major)
    return major
  }

  addUserProfile(profile: MockUserProfile) {
    this.userProfiles.set(profile.userId, profile)
    return profile
  }

  linkUserToSchool(userId: string, schoolId: number) {
    this.userSchools.set(userId, schoolId)
  }

  linkUserToMajor(userId: string, majorId: number) {
    this.userMajors.set(userId, majorId)
  }
}

export const mockDb = new MockDatabase()
