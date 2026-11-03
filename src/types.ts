export type CaptionLang = 'en' | 'hi' | 'hl'

export const CAPTION_LANG_LABEL: Record<CaptionLang, string> = {
  en: 'English',
  hi: 'हिन्दी',
  hl: 'Hinglish',
}

/** One caption cue. `s` is the start time in seconds; the cue lasts until the next cue. */
export interface Cue {
  s: number
  en: string
  hi: string
  hl: string
}

export interface Video {
  id: string // internal id
  youtubeId: string // SAMPLE id (demo) - not guaranteed to exist
  title: string
  channel: string // fictional demo channel
  durationSec: number
  cues: Cue[]
}

export interface Playlist {
  id: string
  title: string
  channel: string
  videoIds: string[]
}

export interface Subject {
  id: string
  name: string
  short: string
  playlists: Playlist[]
}

export interface SyllabusUnit {
  title: string
  topics: string[]
  videoIds: string[]
}

export interface ExamSubjectMap {
  subjectId: string
  weightNote?: string
  units: SyllabusUnit[]
}

export interface Exam {
  id: string
  name: string
  kind: 'competitive' | 'university'
  blurb: string
  subjects: ExamSubjectMap[]
}

export interface VideoProgress {
  position: number
  duration: number
  /** indexes of watched 10-second buckets */
  buckets: number[]
  completed: boolean
  updatedAt: number
}

export interface Bookmark {
  id: string
  videoId: string
  t: number
  note: string
  label: BookmarkLabel
  createdAt: number
}

export type BookmarkLabel = 'Formula' | 'Definition' | 'Doubt' | 'Exam tip'
export const BOOKMARK_LABELS: BookmarkLabel[] = ['Formula', 'Definition', 'Exam tip', 'Doubt']

export interface ProfileData {
  examId: string | null
  lastVideoId: string | null
  captionLang: CaptionLang
  progress: Record<string, VideoProgress>
  bookmarks: Bookmark[]
}

export interface Profile {
  id: string
  name: string
  color: string
  createdAt: number
}

export interface DeviceSettings {
  theme: 'system' | 'light' | 'dark'
  lowData: boolean
}
