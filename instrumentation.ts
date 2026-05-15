export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    try {
      const { initScheduler } = await import('./lib/automations/scheduler')
      await initScheduler()
    } catch (err) {
      console.error('Failed to initialize automation scheduler:', err)
    }
  }
}
