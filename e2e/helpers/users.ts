export const TEST_USERS = {
  admin: {
    email: 'admin@test.local',
    password: 'TestAdminPass123!',
    name: 'Test Admin',
    role: 'admin',
  },
  member: {
    email: 'member@test.local',
    password: 'TestMemberPass123!',
    name: 'Test Member',
    role: 'member',
  },
  household: {
    email: 'household@test.local',
    password: 'TestHouseholdPass123!',
    name: 'Test Household',
    role: 'household',
  },
  guest: {
    email: 'guest@test.local',
    password: 'TestGuestPass123!',
    name: 'Test Guest',
    role: 'guest',
  },
} as const;

export type TestUserRole = keyof typeof TEST_USERS;
