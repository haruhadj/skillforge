import { describe, it, expect } from 'vitest'
import { computeLearningGapReport } from '@/app/services/analyticsCompute'
import {
  buildFindings,
  buildReportCsv,
  buildReportHtml,
  reportFileStem,
} from '@/app/services/analyticsReport'

// Covers the pure report builders backing the admin/teacher "Generate Report"
// action. Uses a real computed report so the fixtures stay in step with
// computeLearningGapReport's output shape.
const report = computeLearningGapReport({
  gameNameMap: { '2048': '2048', sudoku: 'Sudoku' },
  users: [
    { uid: 'u1', username: 'Alice', email: 'alice@example.com', role: 'user', deviceType: 'mobile', deviceOs: 'iOS' },
    { uid: 'u2', username: 'Bob', email: 'bob@example.com', role: 'user', deviceType: 'desktop' },
    { uid: 'admin1', username: 'Admin', email: 'admin@example.com', role: 'admin' },
  ],
  scores: [
    { uid: 'u1', gameId: '2048', bestScore: 10 },
    { uid: 'u2', gameId: '2048', bestScore: 100 },
    { uid: 'u1', gameId: 'sudoku', bestScore: 90 },
    { uid: 'u2', gameId: 'sudoku', bestScore: 100 },
  ],
  stats: [
    { uid: 'u1', gameId: '2048', totalMatchCount: 4 },
    { uid: 'u2', gameId: '2048', totalMatchCount: 6 },
  ],
})

const opts = { anonymize: false, preparedBy: 'Ms. Cruz' }

describe('buildFindings', () => {
  it('reports module and student counts in the opening statement', () => {
    const findings = buildFindings(report)
    expect(findings[0]).toContain(`${report.gameAnalytics.length} game module`)
    expect(findings[0]).toContain(`${report.totalStudents} student account`)
  })

  it('names the weakest subject area', () => {
    const weakest = [...report.subjectAnalytics].sort(
      (a, b) => a.avgNormalizedScore - b.avgNormalizedScore
    )[0]
    expect(buildFindings(report).join(' ')).toContain(weakest.subject)
  })
})

describe('buildReportHtml', () => {
  it('emits a self-contained document with every numbered section', () => {
    const html = buildReportHtml(report, opts)
    expect(html.startsWith('<!doctype html>')).toBe(true)
    for (const heading of [
      '1. Summary',
      '2. Findings',
      '3. Learning Gap Matrix',
      '4. Performance by Subject Area',
      '5. Learners Requiring Attention',
      '7. Methodology',
    ]) {
      expect(html).toContain(heading)
    }
    expect(html).toContain('Prepared by Ms. Cruz')
  })

  it('replaces learner identifiers with pseudonyms when anonymized', () => {
    const named = buildReportHtml(report, opts)
    const anon = buildReportHtml(report, { ...opts, anonymize: true })

    // The fixture must actually contain an at-risk learner for this to be meaningful.
    expect(report.atRiskStudents.length).toBeGreaterThan(0)
    expect(named).toContain('alice@example.com')
    expect(anon).not.toContain('alice@example.com')
    expect(anon).not.toContain('Alice')
    expect(anon).toContain('Student 01')
  })

  it('escapes HTML-significant characters in institution text', () => {
    const html = buildReportHtml(report, { ...opts, institution: '<script>x</script>' })
    expect(html).not.toContain('<script>x</script>')
    expect(html).toContain('&lt;script&gt;')
  })
})

describe('buildReportCsv', () => {
  it('includes a section per dataset with matching row counts', () => {
    const csv = buildReportCsv(report, opts)
    expect(csv).toContain('# Learning gap matrix')
    expect(csv).toContain('# Subject performance')
    expect(csv).toContain('# Device distribution')

    const matrix = csv.split('# Learning gap matrix')[1].split('#')[0].trim().split('\n')
    expect(matrix.length - 1).toBe(report.gameAnalytics.length) // minus header
  })

  it('quotes cells containing commas', () => {
    const withComma = {
      ...report,
      gameAnalytics: [{ ...report.gameAnalytics[0], gameName: 'Chess, Advanced' }],
    }
    expect(buildReportCsv(withComma, opts)).toContain('"Chess, Advanced"')
  })

  it('omits emails when anonymized', () => {
    expect(buildReportCsv(report, { ...opts, anonymize: true })).not.toContain('alice@example.com')
  })
})

describe('reportFileStem', () => {
  it('builds a filesystem-safe timestamped name', () => {
    const stem = reportFileStem(new Date('2026-07-20T14:30:00Z'))
    expect(stem).toBe('skillforge-analytics-report-2026-07-20-14-30')
    expect(stem).not.toMatch(/[:/\\]/)
  })
})
