function SectionHeader({ eyebrow, title, description, action }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:gap-5 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0 max-w-2xl">
        {eyebrow ? (
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.3em] text-[#EAB308] sm:mb-3 sm:text-xs sm:tracking-[0.34em]">{eyebrow}</p>
        ) : null}
        <h2 className="display-title text-3xl leading-none text-[#0F172A] sm:text-5xl">{title}</h2>
        {description ? (
          <p className="mt-3 text-sm leading-6 text-slate-500 sm:mt-4 sm:text-base sm:leading-7">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0 self-start lg:self-end">{action}</div> : null}
    </div>
  )
}

export default SectionHeader
