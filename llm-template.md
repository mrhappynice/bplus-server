
### LLM Prompt Template for Editing an App

You are an expert full-stack developer specializing in Node.js, Express, and vanilla JavaScript. Your task is to modify an existing self-contained application within a unified server environment. You must adhere strictly to the architecture and file structure described below.

### System Architecture & Rules

The server (`server.js`) acts as a central hub that hosts multiple "mini-apps." Each app follows a consistent and simple file structure.

1.  **Main Server (`server.js`):** This file is NOT provided and MUST NOT be modified. It is responsible for mounting each app's routes.

2.  **App Directory Structure:** Every application exists within the `apps/` directory and has the following structure. The `<app-slug>` is the unique, URL-friendly name of the app.

    ```
    apps/
    └── <app-slug>/
        ├── routes.js        (Backend API Logic for this specific app)
        └── public/          (All frontend files for this app)
            ├── index.html
            ├── script.js
            └── style.css
    ```

3.  **How Apps are Mounted & Accessed:** The main `server.js` file mounts each app using two specific lines of code:
    *   **Frontend:** `app.use('/<app-slug>', express.static(...));`
        *   This makes the `public` directory accessible at `http://localhost:3000/<app-slug>`.
        *   Example: `index.html` is served at `http://localhost:3000/<app-slug>/index.html`.
    *   **Backend:** `app.use('/api/<app-slug>', ...);`
        *   This prefixes all backend routes from `routes.js` with `/api/<app-slug>`.
        *   Example: A route defined as `router.get('/hello', ...)` in `routes.js` is accessible at `http://localhost:3000/api/<app-slug>/hello`.

4.  **Client-Server Interaction:** The frontend `script.js` file MUST use the correct API prefix when making `fetch` requests to its own backend. For example: `fetch('/api/<app-slug>/my-endpoint')`.

### Your Task & Provided Files

**My Request:** {{PASTE YOUR DETAILED EDIT REQUEST HERE. For example: "In the test-app, change the h1 text to 'My Edited App'. When the page loads, make the script.js fetch data from the `/api/test-app/hello` endpoint and display the returned message in the paragraph with the id `message-from-js`."}}

Below are the complete files for the app named **`<app-slug>`**. Please modify them according to my request.

--- START OF FILE apps/<app-slug>/routes.js ---
{{PASTE routes.js CONTENT HERE}}
--- END OF FILE apps/<app-slug>/routes.js ---

--- START OF FILE apps/<app-slug>/public/index.html ---
{{PASTE index.html CONTENT HERE}}
--- END OF FILE apps/<app-slug>/public/index.html ---

--- START OF FILE apps/<app-slug>/public/script.js ---
{{PASTE script.js CONTENT HERE}}
--- END OF FILE apps/<app-slug>/public/script.js ---

--- START OF FILE apps/<app-slug>/public/style.css ---
{{PASTE style.css CONTENT HERE}}
--- END OF FILE apps/<app-slug>/public/style.css ---

### Output Format

Your response MUST be only the complete, modified files, formatted exactly as shown below. If a file is unchanged, include it as-is. Provide all four files in your response. Briefly explain your changes in the "Reasoning" section at the end.

--- START OF FILE apps/<app-slug>/routes.js ---
(Your modified code for routes.js here)
--- END OF FILE apps/<app-slug>/routes.js ---

--- START OF FILE apps/<app-slug>/public/index.html ---
(Your modified code for index.html here)
--- END OF FILE apps/<app-slug>/public/index.html ---

--- START OF FILE apps/<app-slug>/public/script.js ---
(Your modified code for script.js here)
--- END OF FILE apps/<app-slug>/public/script.js ---

--- START OF FILE apps/<app-slug>/public/style.css ---
(Your modified code for style.css here)
--- END OF FILE apps/<app-slug>/public/style.css ---

--- REASONING ---
(Your brief explanation of the changes made.)