# CMS Guide

## Provider
- CMS: `Sanity`
- Course source of truth: Sanity documents synced into Supabase `courses`/`lessons`

## Required Environment Variables
- `NEXT_PUBLIC_SANITY_PROJECT_ID`
- `NEXT_PUBLIC_SANITY_DATASET`
- `SANITY_API_TOKEN` (viewer for draft reads, editor for writes/seeding)

## Core Content Model
- `course`
- Fields: `title`, `slug`, `description`, `difficulty`, `duration_minutes`, `xp_reward`, `thumbnail`, `category`, `published`
- `lesson`
- Fields: `title`, `slug`, `course` reference, `content`, `lesson_type`, `duration_minutes`, `xp_reward`, `order`, `isPublished`

## Authoring Workflow
1. Create/update course in Sanity Studio.
2. Add lessons under the course and assign `order` sequentially.
3. Publish course and lessons.
4. Open app route that resolves the course; backend sync writes to Supabase.

## Sync Notes
- `course.service.ts` resolves by ID/slug and can backfill missing records.
- If lesson sync fails due duplicate sanity IDs, dedupe by `sanity_id` in Supabase before retrying.

## Troubleshooting
- Error: `Course exists in Sanity but is not synced to Supabase`
- Ensure `SUPABASE_SERVICE_ROLE_KEY` is set and retry.
- Error: duplicate key on `lessons_sanity_id_key`
- Remove duplicated lesson rows in Supabase or update conflicting `sanity_id`.
