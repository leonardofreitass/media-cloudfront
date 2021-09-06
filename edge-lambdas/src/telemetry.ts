import { createMetricsLogger, MetricsLogger, Unit } from 'aws-embedded-metrics'

type Telemetry = {
  metrics: MetricsLogger,
  log: (msg: string) => void
}

async function withTelemetry<T> (fn: (telemetry: Telemetry) => T | Promise<T>): Promise<T> {
  const _log: string[] = []
  const metrics = createMetricsLogger()
  const log = (msg: string): void => {
    _log.push(msg)
  }

  metrics.setDimensions({ Region: process.env.AWS_REGION || 'unknown' })

  try {
    const result: T = await fn({ metrics, log })
    metrics.putMetric('HandlerOk', 1, Unit.Count)
    return result
  } catch (error) {
    metrics.putMetric('HandlerError', 1, Unit.Count)
    throw error
  } finally {
    try {
      metrics.putMetric('HandlerExecution', 1, Unit.Count)
      metrics.setProperty('log', _log)
      await metrics.flush()
    } catch (e) { /** noop */ }
  }
}

export default withTelemetry;
