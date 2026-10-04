const DEFAULT_MODEL = process.env.OPENAI_MODEL || 'gpt-5-mini'

export async function callAI({ messages, json = false, maxTokens = 1600, model = DEFAULT_MODEL }) {
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY manquante')

  const body = {
    model,
    messages,
    max_completion_tokens: maxTokens,
  }
  if (json) body.response_format = { type: 'json_object' }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    console.error('OpenAI request failed', { status: response.status, error: data?.error?.code || data?.error?.type })
    throw new Error(data?.error?.message || `OpenAI ${response.status}`)
  }

  return {
    text: data.choices?.[0]?.message?.content || '',
    usage: data.usage || null,
    model: data.model || model,
  }
}

export async function callAIText(options) {
  const { text } = await callAI(options)
  return text
}

export async function callAIJson(options) {
  const { text, ...meta } = await callAI({ ...options, json: true })
  const clean = text.replace(/```json|```/g, '').trim()
  return { data: JSON.parse(clean), ...meta }
}
