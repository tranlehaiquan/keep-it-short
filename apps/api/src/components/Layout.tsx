/** @jsxImportSource hono/jsx */
import { html } from "hono/html";

export const Layout = (props: { title: string; children: any }) => {
  return (
    <html>
      <head>
        <title>{props.title}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body class="bg-gray-900 text-white min-h-screen flex items-center justify-center p-4">
        {props.children}
      </body>
    </html>
  );
};
