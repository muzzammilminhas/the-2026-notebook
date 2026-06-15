import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

function formatDateTime(value) {
  if (!value) return 'Not available'
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(value))
}

function duration(startedAt, finishedAt) {
  if (!startedAt || !finishedAt) return 'Running'
  const ms = new Date(finishedAt).getTime() - new Date(startedAt).getTime()
  if (!Number.isFinite(ms) || ms < 0) return 'Unknown'
  return `${(ms / 1000).toFixed(1)}s`
}

function statusCounts(matches) {
  return matches.reduce(
    (counts, match) => ({
      ...counts,
      [match.status]: (counts[match.status] ?? 0) + 1,
    }),
    {},
  )
}

export function AdminStatus({ isAdmin, loading }) {
  const [state, setState] = useState({
    loading: true,
    error: '',
    runs: [],
    matches: [],
    totals: {
      users: 0,
      predictions: 0,
      knockoutPredictions: 0,
      corrections: 0,
    },
    checkedAt: null,
  })

  useEffect(() => {
    if (!isAdmin) return undefined

    let cancelled = false

    async function loadAdminStatus() {
      setState((current) => ({ ...current, loading: true, error: '' }))
      const [
        runsResult,
        matchesResult,
        usersResult,
        predictionsResult,
        knockoutResult,
        correctionsResult,
      ] = await Promise.all([
        supabase
          .from('result_sync_runs')
          .select(
            'id, provider, status, fixtures_received, fixtures_updated, error_message, started_at, finished_at',
          )
          .order('started_at', { ascending: false })
          .limit(8),
        supabase
          .from('matches')
          .select('id, status, stage, verified, synced_at, updated_at'),
        supabase.from('profiles').select('id', {
          count: 'exact',
          head: true,
        }),
        supabase.from('predictions').select('user_id', {
          count: 'exact',
          head: true,
        }),
        supabase.from('knockout_predictions').select('user_id', {
          count: 'exact',
          head: true,
        }),
        supabase.from('result_corrections').select('id', {
          count: 'exact',
          head: true,
        }),
      ])

      if (cancelled) return
      const error =
        runsResult.error
        ?? matchesResult.error
        ?? usersResult.error
        ?? predictionsResult.error
        ?? knockoutResult.error
        ?? correctionsResult.error

      setState({
        loading: false,
        error: error?.message ?? '',
        runs: runsResult.data ?? [],
        matches: matchesResult.data ?? [],
        totals: {
          users: usersResult.count ?? 0,
          predictions: predictionsResult.count ?? 0,
          knockoutPredictions: knockoutResult.count ?? 0,
          corrections: correctionsResult.count ?? 0,
        },
        checkedAt: new Date(),
      })
    }

    loadAdminStatus()
    const timer = window.setInterval(loadAdminStatus, 60_000)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [isAdmin])

  const counts = useMemo(() => statusCounts(state.matches), [state.matches])
  const latestRun = state.runs[0]
  const failedRuns = state.runs.filter((run) => run.status === 'failed').length
  const verifiedMatches = state.matches.filter((match) => match.verified).length

  if (!isAdmin) {
    return (
      <div className="admin-view">
        <section className="page-heading">
          <div>
            <span className="hand-note">Restricted page</span>
            <h2>Admin status</h2>
            <p>
              Sign in with the admin account to view sync health. This page does
              not use a public hardcoded password.
            </p>
          </div>
        </section>
        <div className="admin-denied">
          <strong>Access denied</strong>
          <span>Your account is not marked as an admin in Supabase.</span>
        </div>
      </div>
    )
  }

  if (loading || state.loading) {
    return (
      <div className="admin-view">
        <section className="page-heading">
          <div>
            <span className="hand-note">System notebook</span>
            <h2>Admin status</h2>
            <p>Checking operational health...</p>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="admin-view">
      <section className="page-heading">
        <div>
          <span className="hand-note">System notebook</span>
          <h2>Admin status</h2>
          <p>
            Private operational dashboard for the FIFA sync, database totals
            and tournament state.
          </p>
        </div>
      </section>

      {state.error ? (
        <div className="admin-error">
          <strong>Could not load admin status</strong>
          <span>{state.error}</span>
        </div>
      ) : null}

      <section className="admin-health-grid">
        <article className={`admin-health-card ${latestRun?.status ?? 'idle'}`}>
          <span>Latest sync</span>
          <strong>{latestRun?.status ?? 'No sync yet'}</strong>
          <small>
            {latestRun
              ? `${latestRun.fixtures_updated}/${latestRun.fixtures_received} fixtures - ${duration(
                  latestRun.started_at,
                  latestRun.finished_at,
                )}`
              : 'Waiting for first run'}
          </small>
        </article>
        <article className="admin-health-card">
          <span>Last checked</span>
          <strong>{formatDateTime(state.checkedAt)}</strong>
          <small>Admin page refreshes every minute</small>
        </article>
        <article className="admin-health-card">
          <span>Match state</span>
          <strong>{counts.live ?? 0} live</strong>
          <small>
            {counts.finished ?? 0} finished - {counts.scheduled ?? 0} scheduled
          </small>
        </article>
        <article className="admin-health-card">
          <span>Verified results</span>
          <strong>{verifiedMatches}/104</strong>
          <small>{state.totals.corrections} correction audit rows</small>
        </article>
        <article className="admin-health-card">
          <span>Users</span>
          <strong>{state.totals.users}</strong>
          <small>Profiles registered</small>
        </article>
        <article className="admin-health-card">
          <span>Predictions</span>
          <strong>
            {state.totals.predictions + state.totals.knockoutPredictions}
          </strong>
          <small>
            {state.totals.predictions} group -{' '}
            {state.totals.knockoutPredictions} knockout
          </small>
        </article>
      </section>

      <section className="admin-sync-log">
        <header>
          <div>
            <span className="hand-note">Recent worker log</span>
            <h3>FIFA sync runs</h3>
          </div>
          <strong>{failedRuns} failures in last {state.runs.length}</strong>
        </header>

        <div className="admin-log-table">
          <div className="admin-log-head">
            <span>Run</span>
            <span>Status</span>
            <span>Fixtures</span>
            <span>Duration</span>
            <span>Started</span>
          </div>
          {state.runs.map((run) => (
            <article className={run.status} key={run.id}>
              <span>#{run.id}</span>
              <strong>{run.status}</strong>
              <span>
                {run.fixtures_updated}/{run.fixtures_received}
              </span>
              <span>{duration(run.started_at, run.finished_at)}</span>
              <span>{formatDateTime(run.started_at)}</span>
              {run.error_message ? <em>{run.error_message}</em> : null}
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
