// Docs on request and context https://docs.netlify.com/functions/build/#code-your-function-2

const parse = (request, context) => {
  const url = new URL(request.url)
  const data = {
    api_key: import.meta.env.ANTHROPIC_API_KEY,
  }
  return data;
}

export default (request, context) => {
  try {
    const data = parse(request, context)
    return new Response(JSON.stringify(data))
  } catch (error) {
    return new Response(error.toString(), {
      status: 500,
    })
  }
}
