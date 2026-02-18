/** @jsxImportSource hono/jsx */
import { html } from 'hono/html'

export const Home = () => {
  return (
    <div class="max-w-md w-full space-y-8 bg-gray-800 p-8 rounded-xl shadow-2xl">
      <div class="text-center">
        <h1 class="text-4xl font-extrabold text-indigo-400">Keep It Short</h1>
        <p class="mt-2 text-gray-400">Paste your long URL below</p>
      </div>

      <div class="space-y-4">
        <div>
          <input
            id="url-input"
            type="url"
            placeholder="https://example.com/very/long/url"
            class="w-full px-4 py-3 rounded-lg bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <button
          id="shorten-btn"
          class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg transition duration-200"
        >
          Shorten URL
        </button>
      </div>

      {/* Result Area (Hidden by default) */}
      <div id="result-container" class="hidden mt-6 p-4 bg-gray-700 rounded-lg border border-indigo-500/30">
        <p class="text-sm text-gray-400 mb-2">Your short link is ready:</p>
        <div class="flex items-center space-x-2">
          <input
            id="result-url"
            readonly
            class="flex-1 bg-gray-800 text-indigo-300 px-3 py-2 rounded border border-gray-600 text-sm"
          />
          <button
            onclick="navigator.clipboard.writeText(document.getElementById('result-url').value)"
            class="text-xs bg-gray-600 hover:bg-gray-500 px-3 py-2 rounded transition"
          >
            Copy
          </button>
        </div>
      </div>

      {/* Client-side logic ("Client Component") */}
      {html`
        <script>
          const btn = document.getElementById('shorten-btn');
          const input = document.getElementById('url-input');
          const resultContainer = document.getElementById('result-container');
          const resultUrl = document.getElementById('result-url');

          btn.addEventListener('click', async () => {
            const url = input.value;
            if (!url) return alert('Please enter a URL');

            btn.disabled = true;
            btn.textContent = 'Shortening...';

            try {
              const res = await fetch('/url', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url })
              });

              if (!res.ok) throw new Error('Failed to shorten');

              const data = await res.json();
              resultUrl.value = data.shortUrl;
              resultContainer.classList.remove('hidden');
            } catch (err) {
              alert(err.message);
            } finally {
              btn.disabled = false;
              btn.textContent = 'Shorten URL';
            }
          });
        </script>
      `}
    </div>
  )
}
