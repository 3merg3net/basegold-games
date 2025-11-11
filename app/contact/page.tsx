'use client'
import Link from 'next/link'

export default function Contact() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-extrabold text-[#FFD700] mb-2">Contact & Support</h2>
      <p className="text-white/70 mb-6">
        Questions, bugs, or partnership ideas? We’d love to hear from you.
      </p>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="card p-5">
          <div className="font-bold mb-1">Telegram</div>
          <p className="text-white/70 text-sm">Join the Base Gold community chat.</p>
          <Link href="https://t.me/your_telegram" target="_blank" className="btn btn-cyan mt-3">Open Telegram</Link>
        </div>
        <div className="card p-5">
          <div className="font-bold mb-1">X / Twitter</div>
          <p className="text-white/70 text-sm">Follow announcements and updates.</p>
          <Link href="https://x.com/your_handle" target="_blank" className="btn btn-cyan mt-3">Open X</Link>
        </div>
        <div className="card p-5">
          <div className="font-bold mb-1">Support Email</div>
          <p className="text-white/70 text-sm">Send us details and the steps to reproduce.</p>
          <Link href="mailto:support@basereserve.gold" className="btn btn-cyan mt-3">Email Support</Link>
        </div>
        <div className="card p-5">
          <div className="font-bold mb-1">GitHub Issues</div>
          <p className="text-white/70 text-sm">Found a bug? Open an issue in the repo.</p>
          <Link href="https://github.com/your-org/basegold-games/issues" target="_blank" className="btn btn-cyan mt-3">Open Issues</Link>
        </div>
      </div>

      <div className="text-xs text-white/60 mt-6">
        For security concerns, please DM a core mod in Telegram and do not share private keys or seed phrases.
      </div>
    </div>
  )
}
