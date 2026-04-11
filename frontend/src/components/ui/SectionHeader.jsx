function SectionHeader({ eyebrow, title, description, action }) {
  return (
    <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0 max-w-2xl">
        {eyebrow ? (
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.34em] text-[#EAB308]">{eyebrow}</p>
        ) : null}
        <h2 className="display-title text-4xl leading-none text-[#0F172A] sm:text-5xl">{title}</h2>
        {description ? (
          <p className="mt-4 text-base leading-7 text-slate-500">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0 self-start lg:self-end">{action}</div> : null}
    </div>
  )
}

export default SectionHeader
