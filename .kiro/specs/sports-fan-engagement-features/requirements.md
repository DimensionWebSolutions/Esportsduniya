# Requirements Document

## Introduction

EsportsDuniya (esportsduniya.in) is a multi-sport live scores and AI-powered commentary platform covering Football, Cricket, NBA, Tennis, and F1. The platform already has live scores, AI narrative commentary, momentum engine, social pulse, fan zone cheering, crowd pulse map, Oracle predictions, match detail pages, standings, analytics, time machine, AI radio, search overlay, dynamic island notifications, and user auth.

This feature set adds the missing engagement layer that modern sports fans expect in 2026: personalized content feeds, gamification with a points/badge economy, fantasy-lite team picks, social follow/activity feeds, match reminders and push notifications, content discovery (highlights reel, trending topics), and a daily challenge system — all designed to drive daily active usage and deepen fan identity on the platform.

## Glossary

- **Platform**: The EsportsDuniya React + Vite frontend and Express.js backend system
- **Fan**: An authenticated user of the Platform
- **Guest**: An unauthenticated visitor of the Platform
- **FanPoints**: The in-platform virtual currency earned through engagement actions
- **Badge**: A visual achievement awarded to a Fan for reaching milestones
- **Streak**: A consecutive-day engagement counter tracked per Fan
- **Daily Challenge**: A time-limited engagement task that resets every 24 hours
- **Fantasy_Pick**: A Fan's pre-match selection of a player or team expected to perform well
- **Leaderboard**: A ranked list of Fans sorted by FanPoints within a time window
- **Feed**: A personalized, chronological stream of sports content items for a Fan
- **Highlight**: A short AI-generated text summary of a key match moment
- **Trending_Topic**: A sport or match that has the highest fan activity in the last hour
- **Follow**: A directional relationship where one Fan subscribes to another Fan's activity
- **Reminder**: A scheduled notification sent to a Fan before a match they opted into
- **Prediction_Streak**: The count of consecutive correct Oracle predictions by a Fan

---

## Requirements

### Requirement 1: Personalized Fan Feed

**User Story:** As a Fan, I want a personalized content feed based on my favorite sports and teams, so that I see relevant match updates, highlights, and news without having to search.

#### Acceptance Criteria

1. WHEN a Fan visits the dashboard, THE Feed SHALL display content items filtered to the Fan's saved favorite sports and teams
2. WHEN a Fan has no favorites configured, THE Feed SHALL display content across all sports with a prompt to set favorites
3. WHEN new match events occur for a followed sport, THE Feed SHALL prepend new content items without requiring a page reload
4. WHEN a Fan taps a content item in the Feed, THE Platform SHALL navigate to the relevant match detail or standings page
5. IF a Fan's favorite sports list is empty, THEN THE Feed SHALL display a "Customize Your Feed" onboarding card as the first item
6. THE Feed SHALL support infinite scroll, loading additional items in batches of 20 when the Fan scrolls to the bottom

---

### Requirement 2: FanPoints and Badge Economy

**User Story:** As a Fan, I want to earn points and badges for engaging with the platform, so that I feel rewarded for my loyalty and have goals to work toward.

#### Acceptance Criteria

1. WHEN a Fan submits a correct Oracle prediction, THE Platform SHALL award the Fan 100 FanPoints plus the wager multiplier bonus
2. WHEN a Fan cheers in the Fan Zone, THE Platform SHALL award the Fan 5 FanPoints (maximum once per match per Fan)
3. WHEN a Fan completes a Daily Challenge, THE Platform SHALL award the Fan 50 FanPoints
4. WHEN a Fan maintains a login Streak of 7 consecutive days, THE Platform SHALL award the Fan a "Week Warrior" Badge
5. WHEN a Fan's total FanPoints crosses a tier threshold (500, 1000, 2500, 5000), THE Platform SHALL award the Fan the corresponding tier Badge and display a congratulatory animation
6. THE Platform SHALL display the Fan's current FanPoints balance and active Badges on the Profile page
7. WHEN a Fan earns a new Badge, THE Platform SHALL display a toast notification with the Badge name and description
8. THE Platform SHALL persist FanPoints and Badges in the user record on the backend

---

### Requirement 3: Daily Challenges

**User Story:** As a Fan, I want daily challenges that give me specific goals to complete, so that I have a reason to return to the platform every day.

#### Acceptance Criteria

1. THE Platform SHALL generate a new set of 3 Daily Challenges every 24 hours at midnight UTC
2. WHEN a Fan views the Daily Challenges panel, THE Platform SHALL display each challenge with its title, description, reward in FanPoints, and a progress indicator
3. WHEN a Fan completes all 3 Daily Challenges in a single day, THE Platform SHALL award a 25 FanPoints bonus and increment the Fan's Streak counter
4. WHEN a Fan's Streak reaches a multiple of 7, THE Platform SHALL award a Streak Badge
5. IF a Fan does not complete any challenge within 24 hours, THEN THE Platform SHALL reset the Fan's current Streak to zero
6. THE Platform SHALL include challenge types such as: "Watch 3 live matches", "Make 2 Oracle predictions", "Cheer in Fan Zone", and "Share a match result"
7. WHEN a challenge is completed, THE Platform SHALL mark it as done with a visual checkmark and prevent duplicate completion

---

### Requirement 4: Fantasy-Lite Team Picks

**User Story:** As a Fan, I want to pick a player or team to "back" before a match starts, so that I can track their performance and earn points if they do well.

#### Acceptance Criteria

1. WHEN a match is in "upcoming" status, THE Platform SHALL display a Fantasy_Pick panel allowing the Fan to select one player or team to back
2. WHEN a Fan submits a Fantasy_Pick, THE Platform SHALL lock the pick and display a confirmation with the selected player/team name
3. WHEN a match transitions to "finished" status, THE Platform SHALL evaluate all Fantasy_Picks for that match and award FanPoints to Fans whose pick performed well (won, top scorer, etc.)
4. THE Platform SHALL display a Fan's active Fantasy_Picks on the Profile page under a "My Picks" section
5. IF a Fan attempts to submit a Fantasy_Pick after a match has started, THEN THE Platform SHALL reject the pick and display an error message "Picks are locked once the match starts"
6. WHEN a Fantasy_Pick is evaluated, THE Platform SHALL send the Fan a notification with the outcome and points earned or lost

---

### Requirement 5: Fan Leaderboard

**User Story:** As a Fan, I want to see how I rank against other fans on a leaderboard, so that I feel competitive and motivated to engage more.

#### Acceptance Criteria

1. THE Platform SHALL display a Leaderboard page showing the top 50 Fans ranked by FanPoints
2. THE Leaderboard SHALL support three time windows: "All Time", "This Week", and "Today"
3. WHEN a Fan views the Leaderboard, THE Platform SHALL highlight the Fan's own row if they appear in the top 50
4. WHEN a Fan is not in the top 50, THE Platform SHALL display the Fan's rank and FanPoints below the top 50 list
5. THE Leaderboard SHALL refresh its data every 60 seconds while the page is visible
6. WHEN a Fan clicks another Fan's row on the Leaderboard, THE Platform SHALL display a mini-profile card showing that Fan's Badges and favorite sports

---

### Requirement 6: Match Reminders and Smart Notifications

**User Story:** As a Fan, I want to set reminders for upcoming matches and receive smart push notifications, so that I never miss a game I care about.

#### Acceptance Criteria

1. WHEN a Fan views an upcoming match card, THE Platform SHALL display a "Remind Me" button
2. WHEN a Fan clicks "Remind Me", THE Platform SHALL register a Reminder for that match and request browser push notification permission if not already granted
3. WHEN a match is 15 minutes away from its scheduled start time, THE Platform SHALL send a push notification to all Fans who set a Reminder for that match
4. WHEN a Fan has notifications enabled, THE Platform SHALL send a push notification when a goal, wicket, or key event occurs in a match the Fan has favorited
5. THE Platform SHALL display a "Reminders" section on the Profile page listing all active Reminders with the ability to cancel them
6. IF a Fan denies push notification permission, THEN THE Platform SHALL fall back to in-app toast notifications for Reminders
7. WHEN a Reminder fires, THE Platform SHALL deep-link the notification to the relevant match detail page

---

### Requirement 7: Social Follow and Activity Feed

**User Story:** As a Fan, I want to follow other fans and see their predictions and cheers, so that I can engage with a community of people who share my sports interests.

#### Acceptance Criteria

1. WHEN a Fan views another Fan's mini-profile card, THE Platform SHALL display a "Follow" button
2. WHEN a Fan clicks "Follow", THE Platform SHALL create a Follow relationship and update the button to "Following"
3. WHEN a Fan clicks "Following" on a Fan they already follow, THE Platform SHALL remove the Follow relationship (unfollow)
4. THE Platform SHALL display a "Following Feed" tab on the dashboard showing recent Oracle predictions, cheers, and Fantasy_Picks from Fans the current Fan follows
5. WHEN a followed Fan makes an Oracle prediction, THE Platform SHALL add an activity item to the follower's Following Feed within 30 seconds
6. THE Platform SHALL display a Fan's follower count and following count on their Profile page
7. IF a Fan has no follows, THEN THE Platform SHALL display a "Discover Fans" prompt in the Following Feed tab with suggested Fans based on shared favorite sports

---

### Requirement 8: Highlights Reel and Content Discovery

**User Story:** As a Fan, I want to discover AI-generated match highlights and trending sports content, so that I can quickly catch up on what I missed.

#### Acceptance Criteria

1. THE Platform SHALL display a "Highlights" section on the dashboard showing the top 5 AI-generated Highlight summaries from the last 24 hours
2. WHEN a Fan clicks a Highlight, THE Platform SHALL expand it to show the full AI-generated text summary and a link to the match detail page
3. THE Platform SHALL display a "Trending Now" bar showing the top 3 Trending_Topics based on fan activity in the last hour
4. WHEN a Fan clicks a Trending_Topic, THE Platform SHALL filter the dashboard to show only matches and content related to that sport or team
5. WHEN a new Highlight is generated, THE Platform SHALL use Gemini with Google Search grounding to produce a 2–3 sentence factual summary of the key match moment
6. THE Platform SHALL refresh the Trending_Topics bar every 5 minutes

---

### Requirement 9: Share and Viral Mechanics

**User Story:** As a Fan, I want to easily share match results, my predictions, and highlights to social media, so that I can show off my sports knowledge and bring friends to the platform.

#### Acceptance Criteria

1. WHEN a Fan views a match card or match detail page, THE Platform SHALL display a "Share" button
2. WHEN a Fan clicks "Share", THE Platform SHALL generate a shareable image card containing the match score, teams, and the EsportsDuniya branding
3. THE Platform SHALL support sharing via the Web Share API on supported browsers, falling back to a copy-to-clipboard action
4. WHEN a Fan shares a correct Oracle prediction, THE Platform SHALL include the prediction result and FanPoints earned in the share card
5. WHEN a Fan uses the share feature, THE Platform SHALL award the Fan 10 FanPoints (maximum once per match per Fan)
6. THE Platform SHALL generate share cards using an HTML Canvas element rendered client-side, requiring no server-side image generation

---

### Requirement 10: Onboarding and Fan Identity Setup

**User Story:** As a new Fan, I want a guided onboarding experience that helps me set up my sports preferences and fan identity, so that the platform feels personalized from my first visit.

#### Acceptance Criteria

1. WHEN a Fan registers for the first time, THE Platform SHALL display a multi-step onboarding flow before redirecting to the dashboard
2. THE Onboarding_Flow SHALL include steps for: selecting favorite sports, choosing a favorite team per sport, and picking a display avatar from a preset set
3. WHEN a Fan completes the Onboarding_Flow, THE Platform SHALL save the selections to the Fan's profile and award 50 FanPoints as a welcome bonus
4. WHEN a Fan skips the Onboarding_Flow, THE Platform SHALL save a flag indicating onboarding was skipped and display a persistent "Complete your profile" banner on the dashboard
5. THE Platform SHALL mark the Onboarding_Flow as complete in localStorage so it is not shown again on subsequent logins
6. WHEN a Fan selects a favorite team during onboarding, THE Platform SHALL immediately filter the Feed preview to show content for that team as a live preview

