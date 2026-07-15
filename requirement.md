Build a production-ready Badminton Tournament Management Application using Next.js (latest), TypeScript, TailwindCSS, ShadCN UI, React Query, and AG Grid.

IMPORTANT ARCHITECTURE REQUIREMENT:

DO NOT USE ANY DATABASE.

Use a single Excel workbook (.xlsx) as the primary data store.

All application data must be stored and managed through Excel sheets using the xlsx package on the server side. Create reusable utilities for reading, writing, updating, deleting, filtering, and calculating data from Excel worksheets.

Architecture:

Next.js Full Stack Application
├── App Router
├── Server Actions
├── API Routes
├── TypeScript
├── TailwindCSS
├── ShadCN UI
├── Excel Storage Layer
└── Reusable Business Services

The application should be fully functional with no dependency on PostgreSQL, MySQL, MongoDB, Firebase, Supabase, or any external database.

================================================================

EXCEL WORKBOOK STRUCTURE

Create a master workbook called:

badminton-data.xlsx

Sheets:

1. Players
2. Clubs
3. Tournaments
4. Teams
5. Registrations
6. Matches
7. Rankings
8. Points_Config
9. Notifications
10. Audit_Log

================================================================

USER ROLES

1. Super Admin
2. Tournament Organizer
3. Player

Role Based Access Control should be implemented.

================================================================

AUTHENTICATION

Implement:

- Login
- Registration
- Forgot Password
- Change Password
- JWT Authentication
- Protected Routes
- Role-Based Authorization

Store user information in Excel.

================================================================

PLAYER MANAGEMENT

Player Fields:

- Player ID
- First Name
- Last Name
- Gender
- Age
- Mobile Number
- Email
- City
- State
- Club
- Skill Level
- Profile Photo
- Registration Date
- Current Points
- Current Ranking

Skill Levels:

- Beginner
- Intermediate
- Advanced
- Professional

Statistics:

- Matches Played
- Wins
- Losses
- Win Percentage
- Titles Won
- Ranking Points

================================================================

CLUB MANAGEMENT

Club Fields:

- Club ID
- Club Name
- Address
- City
- State
- Contact Person
- Contact Number
- Number of Members

Features:

- Club leaderboard
- Club rankings
- Club-wise stats

================================================================

TOURNAMENT MANAGEMENT

Tournament Fields:

- Tournament ID
- Tournament Name
- Description
- Venue
- Start Date
- End Date
- Organizer
- Category
- Status

Tournament Types:

- Singles
- Men's Doubles
- Women's Doubles
- Mixed Doubles

Tournament Formats:

- Knockout
- Round Robin
- League
- League + Knockout

Status:

- Draft
- Registration Open
- Ongoing
- Completed

================================================================

REGISTRATION MANAGEMENT

Features:

- Player Registration
- Doubles Team Registration
- Organizer Approval
- Waitlist

Status:

- Pending
- Approved
- Rejected
- Waitlisted

================================================================

TEAM MANAGEMENT

For Doubles Events:

Fields:

- Team ID
- Team Name
- Player 1
- Player 2
- Team Points
- Team Ranking

================================================================

MATCH MANAGEMENT

Match Fields:

- Match ID
- Tournament ID
- Round
- Court Number
- Match Date
- Match Time
- Player/Team 1
- Player/Team 2

Scoring:

Badminton Best of 3 Sets

Store:

- Set 1 Score
- Set 2 Score
- Set 3 Score

Results:

- Winner
- Runner Up
- Match Duration

Status:

- Scheduled
- Live
- Completed
- Walkover

================================================================

FIXTURE GENERATION ENGINE

Automatically generate fixtures.

Support:

1. Knockout

Rounds:

- Round of 64
- Round of 32
- Round of 16
- Quarter Finals
- Semi Finals
- Final

2. Round Robin

- Every participant plays every other participant.

3. League + Knockout

- Top N players qualify for knockout stages.

Generate fixtures automatically.

================================================================

POINTS CALCULATION ENGINE

Create fully configurable points settings.

Default Example:

Participation = 10

Match Win = 20

Quarter Final = 30

Semi Final = 50

Runner Up = 75

Champion = 100

Admin can update values from the UI.

Store settings in Points_Config worksheet.

================================================================

RANKING ENGINE

Automatically calculate:

- Overall Rankings
- State Rankings
- Club Rankings
- Yearly Rankings

Ranking Factors:

1. Tournament Points
2. Win Percentage
3. Titles Won
4. Recent Performance

Whenever match results are entered:

- Recalculate rankings automatically
- Update ranking sheet
- Update leaderboard

================================================================

LEADERBOARDS

Create professional leaderboards.

Columns:

- Rank
- Name
- Club
- Matches Played
- Wins
- Win Percentage
- Points

Filters:

- Tournament
- Club
- State
- Year
- Event Type

================================================================

DASHBOARD

ADMIN DASHBOARD

Display:

- Total Players
- Total Clubs
- Active Tournaments
- Matches Played
- Rankings Summary

ORGANIZER DASHBOARD

Display:

- Managed Tournaments
- Pending Registrations
- Upcoming Matches
- Tournament Statistics

PLAYER DASHBOARD

Display:

- Current Ranking
- Total Points
- Upcoming Matches
- Match History
- Tournament History

================================================================

STATISTICS MODULE

Player Statistics:

- Total Matches
- Total Wins
- Total Losses
- Win Rate
- Titles Won
- Ranking History

Tournament Statistics:

- Players Participated
- Matches Played
- Most Wins
- Highest Points Earned

Create beautiful charts:

- Line Charts
- Bar Charts
- Pie Charts

Use Recharts.

================================================================

NOTIFICATIONS

Support:

- Registration Approved
- Match Schedule Created
- Match Result Published
- Ranking Updated
- Tournament Announcements

Create an in-app notification center.

Store all notifications in Excel.

================================================================

GLOBAL SEARCH

Search Across:

- Players
- Clubs
- Teams
- Tournaments

Add advanced filters.

================================================================

REPORTS

Generate:

1. Tournament Report
2. Ranking Report
3. Player Report
4. Club Performance Report

Export Options:

- Excel
- CSV
- PDF

================================================================

AUDIT LOGGING

Track:

- User Login
- User Updates
- Tournament Creation
- Match Updates
- Ranking Changes

Store logs in Audit_Log sheet.

================================================================

UI REQUIREMENTS

Build a modern sports-themed UI.

Requirements:

- Responsive Design
- Mobile Friendly
- Tablet Friendly
- Desktop Friendly
- Dark Theme
- Light Theme
- Modern Dashboard
- Professional Data Tables
- Reusable Components

================================================================

TECHNICAL REQUIREMENTS

Use:

- Next.js App Router
- TypeScript
- TailwindCSS
- ShadCN UI
- React Query
- AG Grid
- Recharts
- JWT Authentication
- XLSX Package

Create:

- Clean Architecture
- SOLID Principles
- Feature-based Folder Structure
- Reusable Components
- Reusable Services
- Reusable Hooks
- Error Handling
- Logging

================================================================

DATA STORAGE LAYER

Create an Excel Service Layer:

Functions:

- Read Sheet
- Write Sheet
- Insert Row
- Update Row
- Delete Row
- Search Data
- Filter Data
- Aggregate Data
- Calculate Rankings

Ensure no data corruption occurs while multiple operations happen.

Implement file locking or safe write mechanisms.

================================================================

DELIVERABLES

Generate:

1. Complete System Architecture
2. Folder Structure
3. Excel Workbook Design
4. All Screens and Pages
5. Authentication Flow
6. Excel Data Layer Design
7. Ranking Engine Design
8. Fixture Generation Algorithms
9. Points Calculation Logic
10. REST API Design
11. Reusable Components Structure
12. Dashboard Design
13. Dark/Light Theme Support
14. Sample Excel Workbook
15. Docker Setup
16. Deployment Guide

Build the application as a professional badminton tournament ecosystem similar to Tournament Software and BWF ranking platforms, but using Excel sheets as the only data storage mechanism and Next.js as the full-stack framework.