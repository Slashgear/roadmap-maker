import { z } from 'zod/mini'
import { TASK_STATUSES, SECTION_COLORS, TASK_TYPES } from './types'

const isoDate = z.string().check(z.regex(/^\d{4}-\d{2}-\d{2}$/))

export const TaskSchema = z.object({
  id: z.string(),
  sectionId: z.string(),
  label: z.string(),
  startDate: isoDate,
  endDate: isoDate,
  status: z.enum(TASK_STATUSES),
  type: z.enum(TASK_TYPES),
  note: z.optional(z.string()),
  externalLink: z.optional(z.string().check(z.url())),
  position: z.number(),
  version: z.optional(z.number()),
})

export const SectionSchema = z.object({
  id: z.string(),
  roadmapId: z.string(),
  label: z.string(),
  color: z.enum(SECTION_COLORS),
  position: z.number(),
  tasks: z.array(TaskSchema),
  version: z.optional(z.number()),
})

export const RoadmapSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  subtitle: z.optional(z.nullable(z.string())),
  startDate: isoDate,
  endDate: isoDate,
  sections: z.array(SectionSchema),
  version: z.optional(z.number()),
})
