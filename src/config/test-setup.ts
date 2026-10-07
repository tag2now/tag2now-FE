import '@testing-library/jest-dom'
import FakeEventSource from '@/chat/fakeEventSource'

// jsdom has no EventSource, and App mounts the chat, which opens one.
globalThis.EventSource = FakeEventSource as unknown as typeof EventSource
