import { z } from 'zod/mini'

const isoDate = z.string().check(z.regex(/^\d{4}-\d{2}-\d{2}$/))

export const TaskSchema = z.object({
  id: z.string(),
  sectionId: z.string(),
  label: z.string(),
  startDate: isoDate,
  endDate: isoDate,
  status: z.enum(['confirmed', 'started', 'pending', 'critical', 'done']),
  type: z.enum(['bar', 'milestone']),
  note: z.optional(z.string()),
  externalLink: z.optional(z.string().check(z.url())),
  position: z.number(),
})

export const SectionSchema = z.object({
  id: z.string(),
  roadmapId: z.string(),
  label: z.string(),
  color: z.enum([
    'orange',
    'purple',
    'cyan',
    'green',
    'pink',
    'blue',
    'amber',
    'indigo',
    'lime',
    'rose',
    'teal',
    'slate',
  ]),
  position: z.number(),
  tasks: z.array(TaskSchema),
})

export const RoadmapSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  subtitle: z.optional(z.nullable(z.string())),
  startDate: isoDate,
  endDate: isoDate,
  sections: z.array(SectionSchema),
})
