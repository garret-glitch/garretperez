import Link from 'next/link'

export const metadata = {
  title: 'Resume — Garret Perez',
  description: 'Resume of Garret Perez — Sales Supervisor, Builder, Houston TX',
}

export default function ResumePage() {
  return (
    <div className="space-y-5 fade-in max-w-[860px]">

      {/* Header */}
      <div className="hero-panel">
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div>
            <h1 className="text-[14px] mb-1" style={{ color: 'var(--text-1)' }}>Garret Perez</h1>
            <div className="body-text text-[13px] font-semibold mb-1" style={{ color: 'var(--text-1)' }}>
              Sales Supervisor · Builder · Family Man
            </div>
            <div className="body-text text-[12px] mb-4" style={{ color: 'var(--text-2)' }}>
              📍 Houston, TX
            </div>
            <div className="flex flex-wrap gap-4 body-text text-[12px]" style={{ color: 'var(--text-2)' }}>
              <a href="tel:346-604-1635" className="flex items-center gap-1.5 hover:opacity-80">
                <span>📞</span> (346) 604-1635
              </a>
              <a href="mailto:gis.owner@gmail.com" className="flex items-center gap-1.5 hover:opacity-80">
                <span>✉️</span> gis.owner@gmail.com
              </a>
              <a href="https://www.linkedin.com/in/garretperez" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 hover:opacity-80" style={{ color: '#5b9bd5' }}>
                <span>🔗</span> linkedin.com/in/garretperez
              </a>
            </div>
          </div>
          <a
            href="/resume.docx"
            download="Garret_Perez_Resume.docx"
            className="osrs-btn text-[8px] px-4 py-2 shrink-0"
          >
            📄 Download Resume
          </a>
        </div>
      </div>

      {/* Experience */}
      <div className="rp-card">
        <h2 className="text-[9px] mb-4 flex items-center gap-2" style={{ color: 'var(--text-1)' }}>
          <span style={{ color: 'var(--gold)' }}>💼</span> Experience
        </h2>
        <div className="space-y-5">

          <div>
            <div className="flex items-start justify-between gap-4 flex-wrap mb-1">
              <div>
                <div className="text-[8px] font-bold" style={{ color: 'var(--text-1)' }}>Sales Supervisor</div>
                <div className="text-[7px]" style={{ color: 'var(--gold)' }}>Wine & Spirits Distribution · Houston, TX</div>
              </div>
              <div className="text-[7px]" style={{ color: 'var(--text-3)' }}>Current</div>
            </div>
            <ul className="body-text text-[12px] space-y-1 pl-4 list-disc" style={{ color: 'var(--text-2)' }}>
              <li>Oversee H-E-B distribution routes and sales team performance across the Houston market</li>
              <li>Coach and develop team members to hit quarterly volume and revenue targets</li>
              <li>Build and maintain relationships with key retail accounts</li>
              <li>Plan and execute route strategy to maximize coverage and efficiency</li>
            </ul>
          </div>

          <div className="border-t pt-4" style={{ borderColor: 'var(--border-dim)' }}>
            <div className="text-[7px] italic mb-2" style={{ color: 'var(--text-3)' }}>
              Full work history available in the downloadable resume above.
            </div>
          </div>
        </div>
      </div>

      {/* Skills */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rp-card">
          <h2 className="text-[9px] mb-3 flex items-center gap-2" style={{ color: 'var(--text-1)' }}>
            <span style={{ color: 'var(--gold)' }}>⚡</span> Professional Skills
          </h2>
          <div className="space-y-2">
            {[
              { skill: 'Sales & Account Management', pct: 92 },
              { skill: 'Team Leadership & Coaching',  pct: 85 },
              { skill: 'Route Planning & Strategy',   pct: 88 },
              { skill: 'Client Relationship Building', pct: 90 },
              { skill: 'Wine & Spirits Knowledge',    pct: 80 },
            ].map(s => (
              <div key={s.skill}>
                <div className="flex justify-between mb-1">
                  <span className="body-text text-[11px]" style={{ color: 'var(--text-2)' }}>{s.skill}</span>
                  <span className="text-[7px]" style={{ color: 'var(--gold)' }}>{s.pct}</span>
                </div>
                <div className="prog-bar">
                  <div className="prog-bar-fill" style={{ width: `${s.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rp-card">
          <h2 className="text-[9px] mb-3 flex items-center gap-2" style={{ color: 'var(--text-1)' }}>
            <span style={{ color: 'var(--gold)' }}>⚒️</span> Other Skills
          </h2>
          <div className="flex flex-wrap gap-2">
            {[
              'DIY & Home Building', 'Event Planning', 'Community Organizing',
              'Haunted House Production', 'Gardening', 'Fishing', 'Cooking',
              'Team Building', 'Problem Solving', 'Leadership',
            ].map(tag => (
              <span key={tag} className="body-text text-[11px] px-2 py-1 rounded"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-2)' }}>
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Download CTA */}
      <div className="rp-card text-center py-6">
        <div className="text-2xl mb-3">📄</div>
        <div className="text-[8px] mb-2" style={{ color: 'var(--text-1)' }}>Want the full resume?</div>
        <p className="body-text text-[12px] mb-4" style={{ color: 'var(--text-2)' }}>
          Download the complete version including full work history, education, and references.
        </p>
        <a
          href="/resume.docx"
          download="Garret_Perez_Resume.docx"
          className="osrs-btn text-[8px] px-5 py-2"
        >
          📄 Download Full Resume (.docx)
        </a>
        <div className="mt-4">
          <Link href="/" className="text-[7px] hover:opacity-70" style={{ color: 'var(--text-3)' }}>
            ← Back to Home
          </Link>
        </div>
      </div>

    </div>
  )
}
