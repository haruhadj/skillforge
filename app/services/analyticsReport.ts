import type { LearningGapReport } from '@/app/services/analyticsCompute'

/**
 * Academic report generation for the admin/teacher Analytics tab.
 *
 * Produces two artifacts from an already-computed LearningGapReport:
 *  - a self-contained printable HTML document (print-to-PDF for thesis appendices)
 *  - a flat CSV of the per-game matrix (for SPSS/Excel/R analysis)
 *
 * Pure string builders + small DOM helpers, so the report content is unit-testable
 * without a browser.
 */

export interface ReportOptions {
  /** Replaces student usernames/emails with sequential pseudonyms (research ethics). */
  anonymize: boolean
  /** Shown in the report header — usually the signed-in staff member. */
  preparedBy?: string
  /** Optional institution / course line for the title block. */
  institution?: string
}

const GAP_LEVEL_LABEL: Record<string, string> = {
  critical: 'Critical',
  moderate: 'Moderate',
  low: 'Low',
}

function esc(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function formatDate(d: Date): string {
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Stable pseudonym map so the same student reads consistently across all sections. */
function buildAliasMap(report: LearningGapReport): Record<string, string> {
  const aliases: Record<string, string> = {}
  const uids = [...report.atRiskStudents].map((s) => s.uid).sort()
  uids.forEach((uid, i) => {
    aliases[uid] = `Student ${String(i + 1).padStart(2, '0')}`
  })
  return aliases
}

// ── Narrative sections ────────────────────────────────────────────────────────

/**
 * Descriptive interpretation of the dataset, written for a reader who has not seen
 * the dashboard. Mirrors the on-screen insights but in full sentences.
 */
export function buildFindings(report: LearningGapReport): string[] {
  const findings: string[] = []
  const critical = report.gameAnalytics.filter((g) => g.gapLevel === 'critical')
  const moderate = report.gameAnalytics.filter((g) => g.gapLevel === 'moderate')
  const sortedBySubject = [...report.subjectAnalytics].sort(
    (a, b) => a.avgNormalizedScore - b.avgNormalizedScore
  )
  const weakest = sortedBySubject[0]
  const strongest = sortedBySubject[sortedBySubject.length - 1]

  findings.push(
    `A total of ${report.gameAnalytics.length} game module${report.gameAnalytics.length !== 1 ? 's were' : ' was'} analyzed across ${report.totalStudents} student account${report.totalStudents !== 1 ? 's' : ''}. The platform-wide mean normalized score is ${report.platformAvgScore}%.`
  )

  if (critical.length > 0) {
    findings.push(
      `${critical.length} module${critical.length !== 1 ? 's exhibit' : ' exhibits'} a critical learning gap (gap score ≥ 65), led by ${critical
        .slice(0, 3)
        .map((g) => `${g.gameName} (${g.normalizedAvgScore}%)`)
        .join(', ')}. These represent the content areas where learner performance falls furthest below the achievable ceiling.`
    )
  } else {
    findings.push(
      'No module exhibits a critical learning gap; all analyzed modules fall within the moderate or low gap bands.'
    )
  }

  if (moderate.length > 0) {
    findings.push(
      `A further ${moderate.length} module${moderate.length !== 1 ? 's fall' : ' falls'} in the moderate gap band (35 ≤ gap score < 65), indicating partial mastery that may benefit from targeted reinforcement.`
    )
  }

  if (weakest) {
    findings.push(
      `By subject area, "${weakest.subject}" records the lowest mean normalized score (${weakest.avgNormalizedScore}% across ${weakest.totalPlays} recorded play${weakest.totalPlays !== 1 ? 's' : ''}), making it the primary candidate for additional instructional support.`
    )
  }
  if (strongest && weakest && strongest.subject !== weakest.subject) {
    findings.push(
      `Conversely, learners perform strongest in "${strongest.subject}" (${strongest.avgNormalizedScore}%), suggesting comparatively secure foundational knowledge in that domain.`
    )
  }

  const misaligned = report.gameAnalytics.filter(
    (g) => g.gapLevel === 'critical' && g.engagementLevel === 'high'
  )
  if (misaligned.length > 0) {
    findings.push(
      `${misaligned.map((g) => g.gameName).join(', ')} ${misaligned.length !== 1 ? 'are' : 'is'} widely played (engagement ≥ 40%) yet ${misaligned.length !== 1 ? 'yield' : 'yields'} low performance. High exposure combined with low attainment points to difficulty calibration rather than lack of practice.`
    )
  }

  const highRisk = report.atRiskStudents.filter((s) => s.riskLevel === 'high')
  if (highRisk.length > 0) {
    findings.push(
      `${highRisk.length} learner${highRisk.length !== 1 ? 's are' : ' is'} classified as high risk (mean normalized score below 30%), warranting individual follow-up.`
    )
  }

  if (report.deviceStats.total > 0) {
    const top = Object.entries(report.deviceStats.deviceTypes).sort((a, b) => b[1] - a[1])[0]
    if (top) {
      const pct = ((top[1] / report.deviceStats.total) * 100).toFixed(1)
      findings.push(
        `Access is predominantly via ${top[0]} devices (${pct}% of ${report.deviceStats.total} tracked accounts), supporting the platform's mobile-first design assumption.`
      )
    }
  }

  return findings
}

const METHODOLOGY: { term: string; definition: string }[] = [
  {
    term: 'Normalized average score',
    definition:
      'The mean of all learners’ best scores for a module, expressed as a percentage of the highest best score achieved by any learner on that module. Normalization allows modules with different scoring scales to be compared directly.',
  },
  {
    term: 'Gap score',
    definition:
      '100 minus the normalized average score. Higher values indicate a wider distance between typical and best-observed performance, interpreted as a learning gap.',
  },
  {
    term: 'Gap level',
    definition:
      'Critical (gap score ≥ 65), Moderate (35 ≤ gap score < 65), Low (gap score < 35).',
  },
  {
    term: 'Engagement rate',
    definition:
      'The percentage of non-administrator student accounts that have recorded at least one score for the module.',
  },
  {
    term: 'Engagement level',
    definition: 'High (≥ 40%), Medium (15–39%), Low (< 15%).',
  },
  {
    term: 'Risk classification',
    definition:
      'Learners are ranked by their mean normalized score across all modules played. High risk denotes a mean below 30%; medium risk denotes a mean below 50%.',
  },
  {
    term: 'Exclusions',
    definition:
      'Accounts holding the administrator role are excluded from student counts and risk classification. Modules with no recorded scores are omitted from the matrix.',
  },
]

// ── HTML report ───────────────────────────────────────────────────────────────

export function buildReportHtml(report: LearningGapReport, options: ReportOptions): string {
  const { anonymize, preparedBy, institution } = options
  const aliases = anonymize ? buildAliasMap(report) : {}
  const findings = buildFindings(report)
  const generated = formatDate(report.generatedAt)
  const critical = report.gameAnalytics.filter((g) => g.gapLevel === 'critical').length
  const moderate = report.gameAnalytics.filter((g) => g.gapLevel === 'moderate').length

  const gameRows = report.gameAnalytics
    .map(
      (g, i) => `
      <tr>
        <td class="num">${i + 1}</td>
        <td>${esc(g.gameName)}</td>
        <td>${esc(g.subject)}</td>
        <td class="num">${g.playCount}</td>
        <td class="num">${g.totalMatches}</td>
        <td class="num">${g.avgBestScore}</td>
        <td class="num">${g.normalizedAvgScore}%</td>
        <td class="num">${g.gapScore}</td>
        <td><span class="tag tag-${g.gapLevel}">${GAP_LEVEL_LABEL[g.gapLevel]}</span></td>
        <td class="num">${g.engagementRate}%</td>
      </tr>`
    )
    .join('')

  const subjectRows = report.subjectAnalytics
    .map(
      (s, i) => `
      <tr>
        <td class="num">${i + 1}</td>
        <td>${esc(s.subject)}</td>
        <td class="num">${s.games.length}</td>
        <td class="num">${s.totalPlays}</td>
        <td class="num">${s.avgNormalizedScore}%</td>
        <td class="num">${s.criticalGameCount}</td>
      </tr>`
    )
    .join('')

  const riskRows = report.atRiskStudents.length
    ? report.atRiskStudents
        .map(
          (s, i) => `
      <tr>
        <td class="num">${i + 1}</td>
        <td>${esc(anonymize ? aliases[s.uid] : s.username)}</td>
        <td>${esc(anonymize ? '—' : s.email || '—')}</td>
        <td class="num">${s.gamesPlayed}</td>
        <td class="num">${s.avgNormalizedScore}%</td>
        <td><span class="tag tag-${s.riskLevel === 'high' ? 'critical' : 'moderate'}">${s.riskLevel === 'high' ? 'High' : 'Medium'}</span></td>
      </tr>`
        )
        .join('')
    : '<tr><td colspan="6" class="empty">No learners met the at-risk threshold.</td></tr>'

  const deviceSection =
    report.deviceStats.total === 0
      ? '<p class="empty">No device telemetry recorded.</p>'
      : `
      <table>
        <thead><tr><th>Category</th><th>Value</th><th class="num">Accounts</th><th class="num">Share</th></tr></thead>
        <tbody>
          ${(['deviceTypes', 'oses', 'browsers'] as const)
            .flatMap((key) => {
              const label = key === 'deviceTypes' ? 'Device type' : key === 'oses' ? 'Operating system' : 'Browser'
              return Object.entries(report.deviceStats[key])
                .sort((a, b) => b[1] - a[1])
                .map(
                  ([name, count]) => `<tr>
                    <td>${label}</td>
                    <td>${esc(name)}</td>
                    <td class="num">${count}</td>
                    <td class="num">${((count / report.deviceStats.total) * 100).toFixed(1)}%</td>
                  </tr>`
                )
            })
            .join('')}
        </tbody>
      </table>`

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>SkillForge Learning Analytics Report</title>
<style>
  :root { --ink:#111827; --muted:#6b7280; --line:#e5e7eb; --accent:#4f46e5; }
  * { box-sizing: border-box; }
  body { margin:0; padding:32px 20px 64px; font-family: "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
         color:var(--ink); line-height:1.55; font-size:14px; }
  .sheet { max-width: 900px; margin: 0 auto; }
  header { border-bottom:3px solid var(--accent); padding-bottom:16px; margin-bottom:24px; }
  h1 { font-size:24px; margin:0 0 4px; letter-spacing:-0.01em; }
  .sub { color:var(--muted); font-size:13px; margin:2px 0; }
  h2 { font-size:16px; margin:32px 0 10px; padding-bottom:6px; border-bottom:1px solid var(--line);
       text-transform:uppercase; letter-spacing:0.04em; }
  p { margin:0 0 10px; }
  .kpis { display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:12px; margin:16px 0 4px; }
  .kpi { border:1px solid var(--line); border-radius:8px; padding:12px 14px; }
  .kpi .label { font-size:10px; text-transform:uppercase; letter-spacing:0.06em; color:var(--muted); }
  .kpi .value { font-size:22px; font-weight:700; margin-top:2px; }
  table { width:100%; border-collapse:collapse; margin:8px 0 4px; font-size:12.5px; }
  th, td { text-align:left; padding:7px 9px; border-bottom:1px solid var(--line); vertical-align:top; }
  thead th { background:#f9fafb; font-size:10.5px; text-transform:uppercase; letter-spacing:0.05em; color:var(--muted); }
  td.num, th.num { text-align:right; font-variant-numeric:tabular-nums; }
  .tag { display:inline-block; padding:1px 8px; border-radius:999px; font-size:10.5px; font-weight:600; }
  .tag-critical { background:#fee2e2; color:#b91c1c; }
  .tag-moderate { background:#fef3c7; color:#b45309; }
  .tag-low { background:#d1fae5; color:#047857; }
  ol.findings li { margin-bottom:9px; }
  dl.method dt { font-weight:600; margin-top:10px; }
  dl.method dd { margin:2px 0 0; color:#374151; }
  .empty { color:var(--muted); font-style:italic; }
  .note { background:#f9fafb; border-left:3px solid var(--accent); padding:10px 14px; font-size:12.5px; color:#374151; }
  footer { margin-top:36px; padding-top:12px; border-top:1px solid var(--line); font-size:11px; color:var(--muted); }
  .table-wrap { overflow-x:auto; }
  @media print {
    body { padding:0; font-size:11.5px; }
    h2 { page-break-after:avoid; }
    table, .kpi { page-break-inside:avoid; }
    tr { page-break-inside:avoid; }
  }
</style>
</head>
<body>
<div class="sheet">
  <header>
    <h1>Learning Analytics Report</h1>
    <p class="sub">SkillForge Interactive Educational Game Hub</p>
    ${institution ? `<p class="sub">${esc(institution)}</p>` : ''}
    <p class="sub">Generated ${esc(generated)}${preparedBy ? ` &middot; Prepared by ${esc(preparedBy)}` : ''}</p>
    ${anonymize ? '<p class="sub"><strong>Learner identifiers anonymized.</strong></p>' : ''}
  </header>

  <h2>1. Summary</h2>
  <div class="kpis">
    <div class="kpi"><div class="label">Modules analyzed</div><div class="value">${report.gameAnalytics.length}</div></div>
    <div class="kpi"><div class="label">Student accounts</div><div class="value">${report.totalStudents}</div></div>
    <div class="kpi"><div class="label">Platform mean score</div><div class="value">${report.platformAvgScore}%</div></div>
    <div class="kpi"><div class="label">Critical gaps</div><div class="value">${critical}</div></div>
    <div class="kpi"><div class="label">Moderate gaps</div><div class="value">${moderate}</div></div>
  </div>

  <h2>2. Findings</h2>
  <ol class="findings">
    ${findings.map((f) => `<li>${esc(f)}</li>`).join('')}
  </ol>

  <h2>3. Learning Gap Matrix</h2>
  <p class="sub">Modules ordered by gap score, descending.</p>
  <div class="table-wrap">
  <table>
    <thead>
      <tr>
        <th class="num">#</th><th>Module</th><th>Subject</th>
        <th class="num">Players</th><th class="num">Matches</th><th class="num">Mean best</th>
        <th class="num">Normalized</th><th class="num">Gap</th><th>Level</th><th class="num">Engagement</th>
      </tr>
    </thead>
    <tbody>${gameRows}</tbody>
  </table>
  </div>

  <h2>4. Performance by Subject Area</h2>
  <div class="table-wrap">
  <table>
    <thead>
      <tr><th class="num">#</th><th>Subject</th><th class="num">Modules</th><th class="num">Plays</th><th class="num">Mean normalized</th><th class="num">Critical modules</th></tr>
    </thead>
    <tbody>${subjectRows}</tbody>
  </table>
  </div>

  <h2>5. Learners Requiring Attention</h2>
  <div class="table-wrap">
  <table>
    <thead>
      <tr><th class="num">#</th><th>Learner</th><th>Email</th><th class="num">Modules played</th><th class="num">Mean normalized</th><th>Risk</th></tr>
    </thead>
    <tbody>${riskRows}</tbody>
  </table>
  </div>

  <h2>6. Access &amp; Device Distribution</h2>
  ${deviceSection}

  <h2>7. Methodology &amp; Definitions</h2>
  <dl class="method">
    ${METHODOLOGY.map((m) => `<dt>${esc(m.term)}</dt><dd>${esc(m.definition)}</dd>`).join('')}
  </dl>
  <p class="note">Scores are derived from each learner's <em>best</em> recorded result per module, not a mean of all
  attempts. Normalization is relative to the highest score observed within the same module, so figures describe
  performance relative to the cohort rather than against an absolute answer key.</p>

  <footer>
    SkillForge Learning Analytics Report &middot; generated ${esc(generated)} &middot; data reflects the platform state at time of generation.
  </footer>
</div>
</body>
</html>`
}

// ── CSV export ────────────────────────────────────────────────────────────────

function csvCell(value: unknown): string {
  const s = String(value ?? '')
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function csvSection(title: string, header: string[], rows: unknown[][]): string {
  return [
    `# ${title}`,
    header.join(','),
    ...rows.map((r) => r.map(csvCell).join(',')),
    '',
  ].join('\n')
}

export function buildReportCsv(report: LearningGapReport, options: ReportOptions): string {
  const aliases = options.anonymize ? buildAliasMap(report) : {}

  const meta = csvSection(
    'Report metadata',
    ['key', 'value'],
    [
      ['generated_at', report.generatedAt.toISOString()],
      ['modules_analyzed', report.gameAnalytics.length],
      ['student_accounts', report.totalStudents],
      ['platform_mean_normalized_score', report.platformAvgScore],
      ['anonymized', options.anonymize ? 'yes' : 'no'],
      ...(options.preparedBy ? [['prepared_by', options.preparedBy]] : []),
    ]
  )

  const games = csvSection(
    'Learning gap matrix',
    [
      'rank', 'game_id', 'game_name', 'subject', 'players', 'total_matches',
      'mean_best_score', 'max_best_score', 'normalized_avg_score', 'gap_score',
      'gap_level', 'engagement_rate', 'engagement_level',
    ],
    report.gameAnalytics.map((g, i) => [
      i + 1, g.gameId, g.gameName, g.subject, g.playCount, g.totalMatches,
      g.avgBestScore, g.maxBestScore, g.normalizedAvgScore, g.gapScore,
      g.gapLevel, g.engagementRate, g.engagementLevel,
    ])
  )

  const subjects = csvSection(
    'Subject performance',
    ['rank', 'subject', 'module_count', 'total_plays', 'mean_normalized_score', 'critical_module_count'],
    report.subjectAnalytics.map((s, i) => [
      i + 1, s.subject, s.games.length, s.totalPlays, s.avgNormalizedScore, s.criticalGameCount,
    ])
  )

  const students = csvSection(
    'Learners requiring attention',
    ['rank', 'learner', 'email', 'modules_played', 'mean_normalized_score', 'risk_level'],
    report.atRiskStudents.map((s, i) => [
      i + 1,
      options.anonymize ? aliases[s.uid] : s.username,
      options.anonymize ? '' : s.email || '',
      s.gamesPlayed,
      s.avgNormalizedScore,
      s.riskLevel,
    ])
  )

  const devices = csvSection(
    'Device distribution',
    ['category', 'value', 'accounts', 'share_percent'],
    (['deviceTypes', 'oses', 'browsers'] as const).flatMap((key) => {
      const label = key === 'deviceTypes' ? 'device_type' : key === 'oses' ? 'operating_system' : 'browser'
      return Object.entries(report.deviceStats[key])
        .sort((a, b) => b[1] - a[1])
        .map(([name, count]) => [
          label,
          name,
          count,
          report.deviceStats.total ? ((count / report.deviceStats.total) * 100).toFixed(1) : '0.0',
        ])
    })
  )

  return [meta, games, subjects, students, devices].join('\n')
}

// ── Browser delivery helpers ──────────────────────────────────────────────────

export function reportFileStem(generatedAt: Date): string {
  const iso = generatedAt.toISOString().slice(0, 16).replace(/[:T]/g, '-')
  return `skillforge-analytics-report-${iso}`
}

/** Opens the printable report in a new tab and triggers the print dialog. */
export function openPrintableReport(html: string): boolean {
  const win = window.open('', '_blank')
  if (!win) return false // popup blocked — caller falls back to download
  win.document.write(html)
  win.document.close()
  win.focus()
  // Let styles/layout settle before invoking print, otherwise Safari prints a blank page.
  setTimeout(() => win.print(), 350)
  return true
}

export function downloadFile(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
