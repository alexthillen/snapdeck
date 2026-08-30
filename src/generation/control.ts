export class GenerationController {
  private stopAllRequested = false
  private readonly stoppedSections = new Set<string>()
  private active: { sectionId: string; controller: AbortController } | null = null

  startUnit(sectionId: string): AbortSignal {
    const controller = new AbortController()
    this.active = { sectionId, controller }
    return controller.signal
  }

  finishUnit(): void {
    this.active = null
  }

  stopAll(): void {
    this.stopAllRequested = true
    this.active?.controller.abort()
  }

  stopSection(sectionId: string): void {
    this.stoppedSections.add(sectionId)
    if (this.active?.sectionId === sectionId) {
      this.active.controller.abort()
    }
  }

  shouldStopAll(): boolean {
    return this.stopAllRequested
  }

  shouldStopSection(sectionId: string): boolean {
    return this.stoppedSections.has(sectionId)
  }

  stopReason(sectionId: string): 'all' | 'section' | undefined {
    if (this.stoppedSections.has(sectionId)) return 'section'
    if (this.stopAllRequested) return 'all'
    return undefined
  }
}
