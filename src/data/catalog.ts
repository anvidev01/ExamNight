import type { Exam, Subject, Video } from '../types'
import { CUES } from './captions'

/**
 * DEMO / CURATED DATA. Exams, syllabus mappings, playlists, channel names, video IDs and captions below are
 * illustrative samples written for this portfolio demo. They are not scraped from, or endorsed by, any real
 * channel, board or university. YouTube IDs are placeholders and will normally not resolve to real videos.
 */
export const DATA_DISCLAIMER =
  'Demo data: exams, syllabi, playlists, video IDs and captions are curated samples written for this demo. Video IDs are placeholders and captions are not real transcripts.'

const v = (id: string, youtubeId: string, title: string, channel: string, durationSec: number): Video => ({
  id, youtubeId, title, channel, durationSec, cues: CUES[id] ?? [],
})

export const VIDEOS: Video[] = [
  v('math-diff-rules', 'SAMPLEmath01', 'Differentiation: first principles and rules', 'Demo Maths Lab', 600),
  v('math-maxima-taylor', 'SAMPLEmath02', 'Maxima, minima and Taylor series', 'Demo Maths Lab', 660),
  v('math-integration', 'SAMPLEmath03', 'Integration: substitution and by parts', 'Demo Maths Lab', 630),
  v('ds-sorting', 'SAMPLEdsa001', 'Quick sort vs merge sort', 'Demo CS Classroom', 660),
  v('ds-trees', 'SAMPLEdsa002', 'Binary trees and traversals', 'Demo CS Classroom', 600),
  v('ds-hashing', 'SAMPLEdsa003', 'Hashing and collision handling', 'Demo CS Classroom', 630),
  v('os-scheduling', 'SAMPLEos0001', 'CPU scheduling algorithms', 'Demo Systems Hub', 600),
  v('os-deadlock', 'SAMPLEos0002', 'Deadlock: conditions, banker algorithm', 'Demo Systems Hub', 660),
  v('os-paging', 'SAMPLEos0003', 'Paging, TLB and page replacement', 'Demo Systems Hub', 690),
]

export const VIDEO_BY_ID: Record<string, Video> = Object.fromEntries(VIDEOS.map((x) => [x.id, x]))

export const SUBJECTS: Subject[] = [
  {
    id: 'math',
    name: 'Engineering Mathematics (Calculus)',
    short: 'Maths',
    playlists: [{ id: 'pl-math', title: 'Calculus crash course (demo playlist)', channel: 'Demo Maths Lab', videoIds: ['math-diff-rules', 'math-maxima-taylor', 'math-integration'] }],
  },
  {
    id: 'dsa',
    name: 'Data Structures',
    short: 'DSA',
    playlists: [{ id: 'pl-dsa', title: 'Data Structures in one week (demo playlist)', channel: 'Demo CS Classroom', videoIds: ['ds-sorting', 'ds-trees', 'ds-hashing'] }],
  },
  {
    id: 'os',
    name: 'Operating Systems',
    short: 'OS',
    playlists: [{ id: 'pl-os', title: 'OS last-week revision (demo playlist)', channel: 'Demo Systems Hub', videoIds: ['os-scheduling', 'os-deadlock', 'os-paging'] }],
  },
]

export const SUBJECT_BY_ID: Record<string, Subject> = Object.fromEntries(SUBJECTS.map((s) => [s.id, s]))

export const EXAMS: Exam[] = [
  {
    id: 'gate-cs',
    name: 'GATE CS/IT',
    kind: 'competitive',
    blurb: 'National-level entrance. Syllabus mapping is a simplified demo of the Engineering Mathematics and core CS sections.',
    subjects: [
      {
        subjectId: 'math',
        weightNote: 'Engineering Mathematics (demo mapping)',
        units: [
          { title: 'Calculus: differentiation', topics: ['Derivative rules', 'Chain rule'], videoIds: ['math-diff-rules'] },
          { title: 'Calculus: maxima, minima, series', topics: ['Stationary points', 'Taylor and Maclaurin'], videoIds: ['math-maxima-taylor'] },
          { title: 'Calculus: integration', topics: ['Substitution', 'By parts', 'Definite integrals'], videoIds: ['math-integration'] },
        ],
      },
      {
        subjectId: 'dsa',
        units: [
          { title: 'Sorting and searching', topics: ['Quick sort', 'Merge sort', 'Complexity'], videoIds: ['ds-sorting'] },
          { title: 'Trees', topics: ['Traversals', 'BST', 'AVL'], videoIds: ['ds-trees'] },
          { title: 'Hashing', topics: ['Collision', 'Chaining', 'Probing'], videoIds: ['ds-hashing'] },
        ],
      },
      {
        subjectId: 'os',
        units: [
          { title: 'Process scheduling', topics: ['FCFS', 'SJF', 'Round robin'], videoIds: ['os-scheduling'] },
          { title: 'Deadlocks', topics: ['Necessary conditions', 'Banker algorithm'], videoIds: ['os-deadlock'] },
          { title: 'Memory management', topics: ['Paging', 'TLB', 'Page replacement'], videoIds: ['os-paging'] },
        ],
      },
    ],
  },
  {
    id: 'btech-sem1',
    name: 'B.Tech Semester 1-2 (university exam)',
    kind: 'university',
    blurb: 'Typical first-year university paper pattern (demo mapping, not tied to any specific university).',
    subjects: [
      {
        subjectId: 'math',
        weightNote: 'Mathematics-I (demo mapping)',
        units: [
          { title: 'Unit 1: Differential calculus', topics: ['Derivative rules', 'Maxima and minima'], videoIds: ['math-diff-rules', 'math-maxima-taylor'] },
          { title: 'Unit 2: Integral calculus', topics: ['Substitution', 'By parts'], videoIds: ['math-integration'] },
        ],
      },
    ],
  },
  {
    id: 'btech-cse-sem4',
    name: 'B.Tech CSE Semester 3-4 (university exam)',
    kind: 'university',
    blurb: 'Core CSE subjects for a typical second-year semester paper (demo mapping, not tied to any specific university).',
    subjects: [
      {
        subjectId: 'dsa',
        units: [
          { title: 'Unit 1: Sorting', topics: ['Quick sort', 'Merge sort'], videoIds: ['ds-sorting'] },
          { title: 'Unit 2: Trees and hashing', topics: ['Binary trees', 'Hash tables'], videoIds: ['ds-trees', 'ds-hashing'] },
        ],
      },
      {
        subjectId: 'os',
        units: [
          { title: 'Unit 1: Processes', topics: ['Scheduling'], videoIds: ['os-scheduling'] },
          { title: 'Unit 2: Deadlock and memory', topics: ['Banker algorithm', 'Paging'], videoIds: ['os-deadlock', 'os-paging'] },
        ],
      },
    ],
  },
]

export const EXAM_BY_ID: Record<string, Exam> = Object.fromEntries(EXAMS.map((e) => [e.id, e]))

/** All video ids reachable under an exam, optionally restricted to a subject. */
export function examVideoIds(examId: string, subjectId?: string): string[] {
  const exam = EXAM_BY_ID[examId]
  if (!exam) return []
  const ids: string[] = []
  for (const sm of exam.subjects) {
    if (subjectId && sm.subjectId !== subjectId) continue
    for (const u of sm.units) for (const id of u.videoIds) if (!ids.includes(id)) ids.push(id)
  }
  return ids
}

/** Find the next video in the subject's flow after `videoId` (within an exam if given). */
export function nextVideoId(videoId: string, examId: string | null): string | null {
  const subj = SUBJECTS.find((s) => s.playlists.some((p) => p.videoIds.includes(videoId)))
  if (!subj) return null
  const ids = examId ? examVideoIds(examId, subj.id) : subj.playlists.flatMap((p) => p.videoIds)
  const i = ids.indexOf(videoId)
  return i >= 0 && i < ids.length - 1 ? ids[i + 1] : null
}

export function subjectOfVideo(videoId: string): Subject | undefined {
  return SUBJECTS.find((s) => s.playlists.some((p) => p.videoIds.includes(videoId)))
}
