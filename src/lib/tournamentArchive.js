let archiveRequest = null

function archiveUrl() {
  const baseUrl = import.meta.env.BASE_URL || '/'
  return `${baseUrl}tournament-archive.json`
}

export async function loadTournamentArchive() {
  if (!archiveRequest) {
    archiveRequest = fetch(archiveUrl(), {
      headers: { Accept: 'application/json' },
    }).then(async (response) => {
      if (!response.ok) {
        throw new Error(`Tournament archive returned HTTP ${response.status}`)
      }
      const archive = await response.json()
      if (
        archive?.schemaVersion !== 1
        || archive?.matches?.length !== 104
      ) {
        throw new Error('Tournament archive is missing or incomplete.')
      }
      return archive
    }).catch((error) => {
      archiveRequest = null
      throw error
    })
  }
  return archiveRequest
}

export async function loadArchivedMatchDetails(fixtureId) {
  const archive = await loadTournamentArchive()
  return archive.matchDetails?.[String(fixtureId)] ?? null
}
