import { describe, expect, it } from 'vitest'
import { FINAL_STREAM } from './finalExperience'

describe('final experience links', () => {
  it('keeps the verified final stream pointed at tapmad', () => {
    const url = new URL(FINAL_STREAM.url)

    expect(url.hostname).toBe('www.tapmad.com')
    expect(url.pathname).toBe(
      '/watch/spain-vs-argentina-fifa-world-cup-live-free/1142951',
    )
  })
})
