function StatTile({ label, value, accent = false }) {
  return (
    <article
      className={`rounded-[1.5rem] border p-5 ${
        accent
          ? 'border-amber-300 bg-gradient-to-br from-amber-50 via-white to-yellow-50'
          : 'border-slate-200 bg-white'
      }`}
    >
      <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">{label}</p>
      <p className="display-title mt-4 text-4xl leading-none text-[#0F172A]">{value}</p>
    </article>
  )
}

export default StatTile
