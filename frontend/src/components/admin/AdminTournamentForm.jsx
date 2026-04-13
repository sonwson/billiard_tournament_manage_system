import { useMemo, useState } from 'react'
import { useAppStore } from '../../store/appStore'
import {
  KNOCKOUT_START_SIZE_OPTIONS,
  TOURNAMENT_EVENT_TYPE_OPTIONS,
  TOURNAMENT_FORMAT_OPTIONS,
  TOURNAMENT_TIER_OPTIONS,
} from '../../utils/uiConstants'
import { resizeImageFileToDataUrl } from '../../utils/file'
import { t } from '../../utils/i18n'

const DEFAULT_TOURNAMENT_POSTER = '/images/default-tournament-poster.jpg'

function createPrizeRow(label = '', payoutCount = 1, perPlayerAmount = '') {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    label,
    payoutCount,
    perPlayerAmount,
  }
}

const DEFAULT_PRIZE_ROWS = [
  createPrizeRow('Champion', 1, ''),
  createPrizeRow('Runner-up', 1, ''),
]

const initialState = {
  name: '',
  description: '',
  gameType: 'pool_9',
  format: 'single_elimination',
  eventType: 'ranking',
  tier: 'major',
  entryFee: '',
  prizeFund: '',
  image: '',
  maxPlayers: 32,
  tableCount: '',
  tvTableCount: '',
  status: 'draft',
  startAt: '',
  endAt: '',
  registrationOpenAt: '',
  registrationCloseAt: '',
  venue: {
    name: '',
    address: '',
    city: '',
  },
  bracketSettings: {
    knockoutStartSize: 16,
  },
  raceToRules: {},
  prizeStructure: DEFAULT_PRIZE_ROWS,
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-700">{label}</span>
      {children}
    </label>
  )
}

function toDateTimeLocal(value) {
  if (!value) return ''

  const date = new Date(value)
  const pad = (item) => String(item).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function nextPowerOfTwo(value) {
  let result = 1
  while (result < value) result *= 2
  return result
}

function getPrizeRowTotal(item) {
  return Number(item.payoutCount || 0) * Number(item.perPlayerAmount || 0)
}

function buildFormState(initialValues) {
  if (!initialValues) {
    return initialState
  }

  const raceToRules = { ...initialState.raceToRules }
  ;(initialValues.raceToRules || []).forEach((item) => {
    raceToRules[item.roundNumber] = String(item.raceTo)
  })

  const prizeStructure = (initialValues.prizeBreakdown || initialValues.prizeStructure || []).map((item) => {
    const payoutCount = Number(item.payoutCount || 1)
    const totalAmount = Number(item.amount || 0)
    const perPlayerAmount = payoutCount > 0 ? totalAmount / payoutCount : totalAmount

    return {
      id: item.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      label: item.label || '',
      payoutCount,
      perPlayerAmount: totalAmount === 0 || item.amount ? String(perPlayerAmount) : '',
    }
  })

  return {
    ...initialState,
    name: initialValues.name || '',
    description: initialValues.overview || initialValues.description || '',
    gameType: initialValues.gameType || 'pool_9',
    format: initialValues.rawFormat || initialValues.formatKey || initialValues.format || 'single_elimination',
    eventType: initialValues.eventType || 'ranking',
    tier: initialValues.tier || 'major',
    entryFee: initialValues.entryFee ?? '',
    prizeFund: initialValues.prizeFund ?? '',
    image: initialValues.image || '',
    maxPlayers: initialValues.fieldSize || initialValues.maxPlayers || 32,
    tableCount: initialValues.tableCount ?? '',
    tvTableCount: initialValues.tvTableCount ?? '',
    status: initialValues.rawStatus || initialValues.status || 'draft',
    startAt: toDateTimeLocal(initialValues.startDate || initialValues.startAt),
    endAt: toDateTimeLocal(initialValues.endDate || initialValues.endAt),
    registrationOpenAt: toDateTimeLocal(initialValues.registrationOpenAt),
    registrationCloseAt: toDateTimeLocal(initialValues.registrationCloseAt),
    venue: {
      name: initialValues.venueName || initialValues.venue || '',
      address: initialValues.venueAddress || '',
      city: initialValues.locationCity || initialValues.location || initialValues.city || '',
    },
    bracketSettings: {
      knockoutStartSize: initialValues.bracketSettings?.knockoutStartSize || initialValues.bracketSettings?.drawSize || 16,
    },
    raceToRules,
    prizeStructure: prizeStructure.length ? prizeStructure : DEFAULT_PRIZE_ROWS,
  }
}

function AdminTournamentForm({ onSubmit, submitting, initialValues = null, mode = 'create', onCancel = null }) {
  const locale = useAppStore((state) => state.locale)
  const [formState, setFormState] = useState(() => buildFormState(initialValues))
  const [errors, setErrors] = useState({})
  const [selectedBackgroundName, setSelectedBackgroundName] = useState('')

  const qualifierBaseSize = nextPowerOfTwo(Math.max(Number(formState.maxPlayers || 2), 2))
  const knockoutStartSize = Number(formState.bracketSettings.knockoutStartSize || 16)
  const doubleEliminationSteps =
    formState.format === 'double_elimination' && qualifierBaseSize > knockoutStartSize
      ? Math.max(1, Math.log2(qualifierBaseSize / knockoutStartSize))
      : 0

  const raceRuleFields = useMemo(() => {
    if (formState.format !== 'double_elimination') {
      return [1, 2, 3, 4].map((roundNumber) => ({
        key: roundNumber,
        label: t(locale, 'tournamentForm.round', { number: roundNumber }),
      }))
    }

    const winnerFields = Array.from({ length: doubleEliminationSteps + 1 }, (_, index) => ({
      key: index + 1,
      label: t(locale, 'tournamentForm.winnerRound', { number: index + 1 }),
    }))
    const loserFields = Array.from({ length: doubleEliminationSteps * 2 }, (_, index) => ({
      key: 101 + index,
      label: t(locale, 'tournamentForm.loserRound', { number: index + 1 }),
    }))

    return [...winnerFields, ...loserFields]
  }, [doubleEliminationSteps, formState.format, locale])

  const prizeRows = formState.prizeStructure || []
  const computedPrizeTotal = prizeRows.reduce((sum, item) => {
    if (!String(item.label || '').trim() && item.perPlayerAmount === '') {
      return sum
    }

    return sum + getPrizeRowTotal(item)
  }, 0)

  function updateField(key, value) {
    setErrors((current) => ({ ...current, [key]: '' }))
    setFormState((prev) => ({ ...prev, [key]: value }))
  }

  function updateVenueField(key, value) {
    setErrors((current) => ({ ...current, [`venue.${key}`]: '' }))
    setFormState((prev) => ({
      ...prev,
      venue: {
        ...prev.venue,
        [key]: value,
      },
    }))
  }

  function updateRaceToRule(roundNumber, value) {
    setErrors((current) => ({ ...current, [`raceToRules.${roundNumber}`]: '' }))
    setFormState((prev) => ({
      ...prev,
      raceToRules: {
        ...prev.raceToRules,
        [roundNumber]: value,
      },
    }))
  }

  function updateBracketSetting(key, value) {
    setErrors((current) => ({ ...current, [`bracketSettings.${key}`]: '' }))
    setFormState((prev) => ({
      ...prev,
      bracketSettings: {
        ...prev.bracketSettings,
        [key]: Number(value),
      },
    }))
  }

  function updatePrizeRow(index, key, value) {
    setErrors((current) => ({ ...current, prizeStructure: '' }))
    setFormState((prev) => ({
      ...prev,
      prizeStructure: prev.prizeStructure.map((item, itemIndex) => (
        itemIndex === index ? { ...item, [key]: value } : item
      )),
    }))
  }

  function addPrizeRow() {
    setFormState((prev) => ({
      ...prev,
      prizeStructure: [...prev.prizeStructure, createPrizeRow('', 1, '')],
    }))
  }

  function removePrizeRow(index) {
    setFormState((prev) => ({
      ...prev,
      prizeStructure: prev.prizeStructure.filter((_, itemIndex) => itemIndex !== index),
    }))
  }

  async function handlePosterChange(event) {
    const file = event.target.files?.[0]
    if (!file) {
      setSelectedBackgroundName('')
      return
    }

    setSelectedBackgroundName(file.name)

    const image = await resizeImageFileToDataUrl(file, {
      width: 1600,
      height: 900,
      quality: 0.8,
    })
    setFormState((prev) => ({
      ...prev,
      image,
    }))
  }

  function validateForm() {
    const nextErrors = {}

    if (!String(formState.name || '').trim()) nextErrors.name = t(locale, 'tournamentForm.validation.tournamentNameRequired')
    if (!String(formState.venue.name || '').trim()) nextErrors['venue.name'] = t(locale, 'tournamentForm.validation.venueNameRequired')
    if (!String(formState.venue.city || '').trim()) nextErrors['venue.city'] = t(locale, 'tournamentForm.validation.cityRequired')
    if (formState.entryFee === '' || Number(formState.entryFee) < 0) nextErrors.entryFee = t(locale, 'tournamentForm.validation.entryFeeRequired')
    if (formState.prizeFund === '' || Number(formState.prizeFund) < 0) nextErrors.prizeFund = t(locale, 'tournamentForm.validation.prizeFundRequired')
    if (formState.maxPlayers === '' || Number(formState.maxPlayers) < 2) nextErrors.maxPlayers = t(locale, 'tournamentForm.validation.maxPlayersRequired')
    if (formState.tableCount === '' || Number(formState.tableCount) < 0) nextErrors.tableCount = t(locale, 'tournamentForm.validation.matchTablesRequired')
    if (formState.tvTableCount === '' || Number(formState.tvTableCount) < 0) nextErrors.tvTableCount = t(locale, 'tournamentForm.validation.tvTablesRequired')
    if (Number(formState.tvTableCount || 0) > Number(formState.tableCount || 0)) {
      nextErrors.tvTableCount = t(locale, 'tournamentForm.validation.tvTablesExceed')
    }
    if (!String(formState.registrationOpenAt || '').trim()) nextErrors.registrationOpenAt = t(locale, 'tournamentForm.validation.registrationOpenRequired')
    if (!String(formState.registrationCloseAt || '').trim()) nextErrors.registrationCloseAt = t(locale, 'tournamentForm.validation.registrationCloseRequired')
    if (!String(formState.startAt || '').trim()) nextErrors.startAt = t(locale, 'tournamentForm.validation.startTimeRequired')
    if (!String(formState.endAt || '').trim()) nextErrors.endAt = t(locale, 'tournamentForm.validation.endTimeRequired')

    if (formState.registrationOpenAt && formState.registrationCloseAt) {
      const openAt = new Date(formState.registrationOpenAt).getTime()
      const closeAt = new Date(formState.registrationCloseAt).getTime()
      if (closeAt < openAt) {
        nextErrors.registrationCloseAt = t(locale, 'tournamentForm.validation.closeAfterOpen')
      }
    }

    if (formState.registrationCloseAt && formState.startAt) {
      const closeAt = new Date(formState.registrationCloseAt).getTime()
      const startAt = new Date(formState.startAt).getTime()
      if (startAt < closeAt) {
        nextErrors.startAt = t(locale, 'tournamentForm.validation.startAfterClose')
      }
    }

    if (formState.startAt && formState.endAt) {
      const startAt = new Date(formState.startAt).getTime()
      const endAt = new Date(formState.endAt).getTime()
      if (endAt < startAt) {
        nextErrors.endAt = t(locale, 'tournamentForm.validation.endAfterStart')
      }
    }

    const validPrizeRows = prizeRows.filter(
      (item) => String(item.label || '').trim() || item.perPlayerAmount !== '',
    )

    if (!validPrizeRows.length) {
      nextErrors.prizeStructure = t(locale, 'tournamentForm.validation.prizeRowRequired')
    } else {
      const hasInvalidPrizeRow = validPrizeRows.some((item) => (
        !String(item.label || '').trim()
        || item.perPlayerAmount === ''
        || Number(item.perPlayerAmount) < 0
        || Number(item.payoutCount || 0) < 1
      ))

      if (hasInvalidPrizeRow) {
        nextErrors.prizeStructure = t(locale, 'tournamentForm.validation.prizeRowInvalid')
      } else if (computedPrizeTotal !== Number(formState.prizeFund || 0)) {
        nextErrors.prizeStructure = t(locale, 'tournamentForm.validation.prizeTotalMismatch')
      }
    }

    raceRuleFields.forEach((field) => {
      const value = formState.raceToRules[field.key]
      if (value === '' || value === null || value === undefined || Number(value) <= 0) {
        nextErrors[`raceToRules.${field.key}`] = t(locale, 'tournamentForm.validation.roundRequired', { label: field.label })
      }
    })

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (!validateForm()) {
      return
    }

    await onSubmit({
      ...formState,
      entryFee: formState.entryFee === '' ? undefined : Number(formState.entryFee),
      tableCount: formState.tableCount === '' ? undefined : Number(formState.tableCount),
      tvTableCount: formState.tvTableCount === '' ? undefined : Number(formState.tvTableCount),
      image: formState.image || DEFAULT_TOURNAMENT_POSTER,
      bracketSettings:
        formState.format === 'double_elimination'
          ? {
              knockoutStartSize: Number(formState.bracketSettings.knockoutStartSize || 16),
            }
          : {},
      raceToRules: Object.entries(formState.raceToRules)
        .filter(([, raceTo]) => raceTo !== '' && raceTo !== null && raceTo !== undefined && Number(raceTo) > 0)
        .map(([roundNumber, raceTo]) => ({
          roundNumber: Number(roundNumber),
          raceTo: Number(raceTo),
        })),
      prizeFund: formState.prizeFund === '' ? undefined : Number(formState.prizeFund),
      prizeStructure: prizeRows
        .filter((item) => String(item.label || '').trim() && item.perPlayerAmount !== '')
        .map((item, index) => ({
          position: index + 1,
          label: String(item.label).trim(),
          payoutCount: Number(item.payoutCount || 1),
          amount: getPrizeRowTotal(item),
        })),
    })

    if (mode === 'create') {
      setFormState(initialState)
      setErrors({})
      setSelectedBackgroundName('')
    }
  }

  function getInputClassName(errorKey) {
    return `w-full rounded-2xl border bg-white px-4 py-3 outline-none transition focus:border-[#EAB308] ${
      errors[errorKey] ? 'border-red-300 focus:border-red-400' : 'border-slate-200'
    }`
  }

  return (
    <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
      <Field label={t(locale, 'tournamentForm.fields.name')}>
        <input className={getInputClassName('name')} value={formState.name} onChange={(event) => updateField('name', event.target.value)} required />
        {errors.name ? <p className="mt-2 text-xs font-medium text-red-600">{errors.name}</p> : null}
      </Field>
      <Field label={t(locale, 'tournamentForm.fields.venueName')}>
        <input className={getInputClassName('venue.name')} value={formState.venue.name} onChange={(event) => updateVenueField('name', event.target.value)} required />
        {errors['venue.name'] ? <p className="mt-2 text-xs font-medium text-red-600">{errors['venue.name']}</p> : null}
      </Field>
      <Field label={t(locale, 'tournamentForm.fields.gameType')}>
        <select className={getInputClassName('gameType')} value={formState.gameType} onChange={(event) => updateField('gameType', event.target.value)}>
          {['pool_8', 'pool_9', 'pool_10', 'carom', 'snooker'].map((value) => (
            <option key={value} value={value}>
              {t(locale, `tournamentForm.options.gameTypes.${value}`)}
            </option>
          ))}
        </select>
      </Field>
      <Field label={t(locale, 'tournamentForm.fields.format')}>
        <select className={getInputClassName('format')} value={formState.format} onChange={(event) => updateField('format', event.target.value)}>
          {TOURNAMENT_FORMAT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {t(locale, `tournamentForm.options.formats.${option.value}`)}
            </option>
          ))}
        </select>
      </Field>
      <Field label={t(locale, 'tournamentForm.fields.eventType')}>
        <select className={getInputClassName('eventType')} value={formState.eventType} onChange={(event) => updateField('eventType', event.target.value)}>
          {TOURNAMENT_EVENT_TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {t(locale, `tournamentForm.options.eventTypes.${option.value}`)}
            </option>
          ))}
        </select>
      </Field>
      <Field label={t(locale, 'tournamentForm.fields.tier')}>
        <select className={getInputClassName('tier')} value={formState.tier} onChange={(event) => updateField('tier', event.target.value)}>
          {TOURNAMENT_TIER_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {t(locale, `tournamentForm.options.tiers.${option.value}`)}
            </option>
          ))}
        </select>
      </Field>
      <Field label={t(locale, 'tournamentForm.fields.status')}>
        <select className={getInputClassName('status')} value={formState.status} onChange={(event) => updateField('status', event.target.value)}>
          {['draft', 'open_registration', 'closed_registration', 'ongoing', 'finished'].map((value) => (
            <option key={value} value={value}>
              {t(locale, `status.${value}`)}
            </option>
          ))}
        </select>
      </Field>
      <Field label={t(locale, 'tournamentForm.fields.prizeFund')}>
        <input className={getInputClassName('prizeFund')} type="number" min="0" value={formState.prizeFund} onChange={(event) => updateField('prizeFund', event.target.value)} placeholder={t(locale, 'tournamentForm.placeholders.prizeFund')} />
        {errors.prizeFund ? <p className="mt-2 text-xs font-medium text-red-600">{errors.prizeFund}</p> : null}
      </Field>

      <div className="md:col-span-2 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-700">{t(locale, 'tournamentForm.fields.prizeBreakdown')}</p>
            <p className="mt-1 text-xs text-slate-500">{t(locale, 'tournamentForm.helper.prizeBreakdownHint')}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
              {t(locale, 'tournamentForm.helper.total')}: {computedPrizeTotal.toLocaleString('en-US')}
            </div>
            <button
              type="button"
              onClick={addPrizeRow}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
            >
              {t(locale, 'tournamentForm.actions.addPrizeRow')}
            </button>
          </div>
        </div>
        <div className="space-y-3">
          {prizeRows.map((item, index) => (
            <div key={item.id || `prize-row-${index}`} className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_120px_180px_120px_110px]">
              <input
                className={getInputClassName('prizeStructure')}
                value={item.label}
                onChange={(event) => updatePrizeRow(index, 'label', event.target.value)}
                placeholder={t(locale, 'tournamentForm.placeholders.prizeLabel')}
              />
              <input
                className={getInputClassName('prizeStructure')}
                type="number"
                min="1"
                value={item.payoutCount}
                onChange={(event) => updatePrizeRow(index, 'payoutCount', event.target.value === '' ? '' : Number(event.target.value))}
                placeholder={t(locale, 'tournamentForm.placeholders.prizeWinners')}
              />
              <input
                className={getInputClassName('prizeStructure')}
                type="number"
                min="0"
                value={item.perPlayerAmount}
                onChange={(event) => updatePrizeRow(index, 'perPlayerAmount', event.target.value)}
                placeholder={t(locale, 'tournamentForm.placeholders.prizeEach')}
              />
              <input
                className="w-full rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-slate-700"
                value={getPrizeRowTotal(item)}
                readOnly
                tabIndex={-1}
                aria-label={t(locale, 'tournamentForm.helper.rowTotal')}
              />
              <button
                type="button"
                onClick={() => removePrizeRow(index)}
                disabled={prizeRows.length <= 1}
                className="rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-bold text-rose-700 transition hover:bg-rose-50 disabled:opacity-50"
              >
                {t(locale, 'tournamentForm.actions.remove')}
              </button>
            </div>
          ))}
        </div>
        {errors.prizeStructure ? <p className="mt-3 text-xs font-medium text-red-600">{errors.prizeStructure}</p> : null}
      </div>

      <Field label={t(locale, 'tournamentForm.fields.backgroundUpload')}>
        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex cursor-pointer items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
            <input className="hidden" type="file" accept="image/*" onChange={handlePosterChange} />
            {t(locale, 'tournamentForm.actions.chooseFile')}
          </label>
          <span className="text-sm text-slate-500">
            {selectedBackgroundName || t(locale, 'tournamentForm.placeholders.noFileChosen')}
          </span>
        </div>
        <p className="mt-2 text-xs text-slate-500">{t(locale, 'tournamentForm.helper.backgroundFallback')}</p>
      </Field>
      {(formState.image || mode === 'create') ? (
        <div className="md:col-span-2 overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white">
          <img src={formState.image || DEFAULT_TOURNAMENT_POSTER} alt={t(locale, 'tournamentForm.previewAlt')} className="h-56 w-full object-cover" />
        </div>
      ) : null}
      <Field label={t(locale, 'tournamentForm.fields.entryFee')}>
        <input className={getInputClassName('entryFee')} type="number" min="0" value={formState.entryFee} onChange={(event) => updateField('entryFee', event.target.value)} placeholder={t(locale, 'tournamentForm.placeholders.entryFee')} />
        {errors.entryFee ? <p className="mt-2 text-xs font-medium text-red-600">{errors.entryFee}</p> : null}
      </Field>
      <Field label={t(locale, 'tournamentForm.fields.maxPlayers')}>
        <input className={getInputClassName('maxPlayers')} type="number" min="2" value={formState.maxPlayers} onChange={(event) => updateField('maxPlayers', Number(event.target.value))} />
        {errors.maxPlayers ? <p className="mt-2 text-xs font-medium text-red-600">{errors.maxPlayers}</p> : null}
      </Field>
      <Field label={t(locale, 'tournamentForm.fields.matchTables')}>
        <input
          className={getInputClassName('tableCount')}
          type="number"
          min="0"
          value={formState.tableCount}
          onChange={(event) => updateField('tableCount', event.target.value)}
          placeholder={t(locale, 'tournamentForm.placeholders.totalTables')}
        />
        {errors.tableCount ? <p className="mt-2 text-xs font-medium text-red-600">{errors.tableCount}</p> : null}
      </Field>
      <Field label={t(locale, 'tournamentForm.fields.tvTables')}>
        <input
          className={getInputClassName('tvTableCount')}
          type="number"
          min="0"
          value={formState.tvTableCount}
          onChange={(event) => updateField('tvTableCount', event.target.value)}
          placeholder={t(locale, 'tournamentForm.placeholders.tvTables')}
        />
        {errors.tvTableCount ? <p className="mt-2 text-xs font-medium text-red-600">{errors.tvTableCount}</p> : null}
      </Field>
      {formState.format === 'double_elimination' ? (
        <>
          <Field label={t(locale, 'tournamentForm.fields.knockoutStartsFrom')}>
            <select
              className={getInputClassName('bracketSettings.knockoutStartSize')}
              value={formState.bracketSettings.knockoutStartSize}
              onChange={(event) => updateBracketSetting('knockoutStartSize', event.target.value)}
            >
              {KNOCKOUT_START_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {t(locale, 'tournamentForm.lastSize', { size })}
                </option>
              ))}
            </select>
          </Field>
          <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600 md:col-span-2">
            {t(locale, 'tournamentForm.helper.doubleEliminationHint')}
          </div>
        </>
      ) : null}
      <Field label={t(locale, 'tournamentForm.fields.city')}>
        <input className={getInputClassName('venue.city')} value={formState.venue.city} onChange={(event) => updateVenueField('city', event.target.value)} required />
        {errors['venue.city'] ? <p className="mt-2 text-xs font-medium text-red-600">{errors['venue.city']}</p> : null}
      </Field>
      <Field label={t(locale, 'tournamentForm.fields.registrationOpens')}>
        <input className={getInputClassName('registrationOpenAt')} type="datetime-local" value={formState.registrationOpenAt} onChange={(event) => updateField('registrationOpenAt', event.target.value)} required />
        {errors.registrationOpenAt ? <p className="mt-2 text-xs font-medium text-red-600">{errors.registrationOpenAt}</p> : null}
      </Field>
      <Field label={t(locale, 'tournamentForm.fields.registrationCloses')}>
        <input className={getInputClassName('registrationCloseAt')} type="datetime-local" value={formState.registrationCloseAt} onChange={(event) => updateField('registrationCloseAt', event.target.value)} required />
        {errors.registrationCloseAt ? <p className="mt-2 text-xs font-medium text-red-600">{errors.registrationCloseAt}</p> : null}
      </Field>
      <Field label={t(locale, 'tournamentForm.fields.startTime')}>
        <input className={getInputClassName('startAt')} type="datetime-local" value={formState.startAt} onChange={(event) => updateField('startAt', event.target.value)} required />
        {errors.startAt ? <p className="mt-2 text-xs font-medium text-red-600">{errors.startAt}</p> : null}
      </Field>
      <Field label={t(locale, 'tournamentForm.fields.endTime')}>
        <input className={getInputClassName('endAt')} type="datetime-local" value={formState.endAt} onChange={(event) => updateField('endAt', event.target.value)} />
        {errors.endAt ? <p className="mt-2 text-xs font-medium text-red-600">{errors.endAt}</p> : null}
      </Field>
      <div className="md:col-span-2 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
        <p className="mb-3 text-sm font-semibold text-slate-700">{t(locale, 'tournamentForm.fields.raceToByRound')}</p>
        <div className="grid gap-4 md:grid-cols-4">
          {raceRuleFields.map((field) => (
            <Field key={field.key} label={field.label}>
              <input
                className={getInputClassName(`raceToRules.${field.key}`)}
                type="number"
                min="1"
                max="25"
                value={formState.raceToRules[field.key] ?? ''}
                onChange={(event) => updateRaceToRule(field.key, event.target.value)}
                placeholder={t(locale, 'tournamentForm.placeholders.raceTo')}
              />
              {errors[`raceToRules.${field.key}`] ? (
                <p className="mt-2 text-xs font-medium text-red-600">{errors[`raceToRules.${field.key}`]}</p>
              ) : null}
            </Field>
          ))}
        </div>
      </div>
      <label className="md:col-span-2 block">
        <span className="mb-2 block text-sm font-semibold text-slate-700">{t(locale, 'tournamentForm.fields.description')}</span>
        <textarea
          className="min-h-28 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-[#EAB308]"
          value={formState.description}
          onChange={(event) => updateField('description', event.target.value)}
        />
      </label>
      <div className="md:col-span-2 flex justify-end">
        {mode === 'edit' && onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="mr-3 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
          >
            {t(locale, 'tournamentForm.actions.cancel')}
          </button>
        ) : null}
        <button
          type="submit"
          disabled={submitting}
          className="rounded-2xl bg-[#0F172A] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#14213D] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? t(locale, 'tournamentForm.actions.saving') : mode === 'edit' ? t(locale, 'tournamentForm.actions.saveChanges') : t(locale, 'tournamentForm.actions.createTournament')}
        </button>
      </div>
    </form>
  )
}

export default AdminTournamentForm
