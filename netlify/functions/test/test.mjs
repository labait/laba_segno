// Docs on request and context https://docs.netlify.com/functions/build/#code-your-function-2
export default (request, context) => {
  try {
    const url = new URL(request.url)
    const data = {
      value: (new Date()),
      key1: process.env.ANTHROPIC_API_KEY,
      key2: process.env.ANTHROPIC_API_KEY2,
    }

    return new Response(JSON.stringify(data))
  } catch (error) {
    return new Response(error.toString(), {
      status: 500,
    })
  }
}
