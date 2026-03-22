import { pgTable, uuid, varchar, text, boolean, timestamp, integer, pgEnum, unique } from 'drizzle-orm/pg-core';

export const planTierEnum = pgEnum('plan_tier', ['free', 'pro', 'team']);

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  emailVerified: boolean('email_verified').default(false),
  displayName: varchar('display_name', { length: 100 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const licenses = pgTable('licenses', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  tier: planTierEnum('tier').notNull().default('free'),
  status: varchar('status', { length: 20 }).notNull().default('active'),
  stripeCustomerId: varchar('stripe_customer_id', { length: 255 }),
  stripeSubscriptionId: varchar('stripe_subscription_id', { length: 255 }).unique(),
  currentPeriodStart: timestamp('current_period_start', { withTimezone: true }),
  currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  refreshTokenHash: varchar('refresh_token_hash', { length: 64 }).notNull().unique(),
  machineId: varchar('machine_id', { length: 64 }),
  deviceLabel: varchar('device_label', { length: 255 }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  revoked: boolean('revoked').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const dailyUsage = pgTable('daily_usage', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  date: varchar('date', { length: 10 }).notNull(), // YYYY-MM-DD
  messageCount: integer('message_count').notNull().default(0),
}, (t) => [unique().on(t.userId, t.date)]);

export const verificationTokens = pgTable('verification_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  tokenHash: varchar('token_hash', { length: 64 }).notNull(),
  purpose: varchar('purpose', { length: 20 }).notNull(), // email_verify, password_reset
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  used: boolean('used').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const teamMemberships = pgTable('team_memberships', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerUserId: uuid('owner_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  memberUserId: uuid('member_user_id').references(() => users.id, { onDelete: 'set null' }),
  invitedEmail: varchar('invited_email', { length: 255 }).notNull(),
  role: varchar('role', { length: 20 }).notNull().default('member'),
  status: varchar('status', { length: 20 }).notNull().default('pending'),
  invitedAt: timestamp('invited_at', { withTimezone: true }).defaultNow(),
  acceptedAt: timestamp('accepted_at', { withTimezone: true }),
}, (t) => [unique().on(t.ownerUserId, t.invitedEmail)]);

export const teamMemory = pgTable('team_memory', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerUserId: uuid('owner_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  key: varchar('key', { length: 255 }).notNull(),
  value: text('value').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (t) => [unique().on(t.ownerUserId, t.key)]);
