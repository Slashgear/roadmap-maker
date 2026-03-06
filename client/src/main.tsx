import { render } from 'preact'
import './index.css'

const root = document.getElementById('root')!

void (async () => {
  if (__APP_MODE__ === 'team') {
    const { default: AppTeam } = await import('./AppTeam')
    render(<AppTeam />, root)
  } else {
    const { default: App } = await import('./App')
    render(<App />, root)
  }
})()
