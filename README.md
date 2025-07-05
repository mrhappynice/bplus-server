# bplus🤷🏻‍♂️ Server: Modular App Environment

A unified Node.js server designed to host, create, and manage multiple self-contained web applications. This project acts as a meta-application, providing tools to build other applications directly from your browser, either manually or with the help of AI.



## About The Project

This server provides a robust foundation for rapid prototyping and development of small, focused web applications. It solves the problem of managing multiple small projects by unifying them under a single, easy-to-manage server instance.

The core of the project is its modular architecture, where each "mini-app" is a self-contained unit with its own front-end and back-end logic. The real power comes from the built-in development tools:

*   **[Gen Studio](#gen-studio-ai-powered-workflow):** An integrated AI development environment. Use natural language prompts to create new applications from scratch or to edit existing ones. It connects to both Google Gemini and local LLMs (via LM Studio) to generate code, which you can then review and deploy with a single click.
*   **[App Manager](#app-manager-manual-editing--deletion):** A control panel for all your created apps. View and edit the source code of any app, delete apps (which also cleans up their routes from the server), or generate structured prompts for modification with an external LLM.
*   **[App Builder](#app-builder-manual-scaffolding):** A manual tool for scaffolding new applications. It provides templates and a simple interface to write the four core files of an app. It also includes a prompt generator to help you use external LLMs effectively.

This system is designed for developers, hobbyists, and tinkerers who want to quickly bring ideas to life without the overhead of setting up a new project environment for every single concept.

### Built With

*   [Node.js](https://nodejs.org/)
*   [Express](https://expressjs.com/)
*   [Vanilla JavaScript](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
*   [SQLite3](https://www.sqlite.org/index.html) (for app-specific persistence)
*   [Google Generative AI SDK](https://github.com/google/generative-ai-js)
*   [Axios](https://axios-http.com/) (for communicating with local LLMs)
*   HTML5 & CSS3

## Getting Started

Follow these steps to get your local development environment up and running.

### Prerequisites

You must have [Node.js](https://nodejs.org/en/download/) (v18 or later recommended) and `npm` installed on your machine.

### Installation

1.  **Clone the repository:**
    ```sh
    git clone https://github.com/your-username/your-repo-name.git
    cd your-repo-name
    ```

2.  **Install NPM packages:**
    ```sh
    npm install
    ```

3.  **Set up environment variables:**
    Create a `.env` file in the root of the project by copying the example file.
    ```sh
    cp env.example .env
    ```
    Now, open the `.env` file and add your Google Gemini API key. This is required for the **Gen Studio** app to function with Gemini models.
    ```env
    GEMINI_API_KEY="YOUR_GOOGLE_GEMINI_API_KEY"
    ```
4. **Whisper Server:**
   Have your Whisper server running on port 5752. Get vulkan compatible exe from the [SoftWhisper repo](https://github.com/NullMagic2/SoftWhisper/releases/tag/May-2025) Tested working on AMD✅ in Windows. 
5. (Optional) **Piper TTS:**
   Download Piper into a folder named piper-tts with voice files. In code it is set to ljspeech-high <-- search for this to change the onnx file name.

## Usage

You can run the server in two modes:

*   **Development Mode:** Uses `nodemon` to automatically restart the server whenever you save a file. This is the recommended mode for development.
    ```sh
    npm run dev
    ```

*   **Production Mode:** Runs the server with a standard `node` command.
    ```sh
    npm start
    ```

Once the server is running, you'll see output in your console indicating the server is live:

```
Unified Server running at http://localhost:3000
...
Application ready!
Homepage: http://localhost:3000
MD-Chat App: http://localhost:3000/md-chat
Pic-Chat App: http://localhost:3000/pic-chat
App Builder:   http://localhost:3000/app-builder
App Manager:   http://localhost:3000/app-manager
Gen Studio:    http://localhost:3000/gen-studio
```

Navigate to `http://localhost:3000` to see the project homepage.

## The Application Workflow

You have two primary workflows for creating and editing applications.

### 1. Gen Studio (AI-Powered Workflow)

This is the fastest and most integrated way to build and modify apps.

*   **To Create an App:**
    1.  Navigate to **Gen Studio** (`/gen-studio`).
    2.  In the "Create App" tab, provide an app name and a detailed prompt describing its functionality.
    3.  Click "Generate Code". The AI will generate the four necessary files.
    4.  Review the code in the output panel.
    5.  If you're satisfied, click "Create and Mount App". The server will create the files and automatically add the routes to `server.js`, then restart.

*   **To Edit an App:**
    1.  Go to the "Edit App" tab in **Gen Studio**.
    2.  Select an existing app from the dropdown menu.
    3.  Describe the changes you want to make in the prompt box.
    4.  Click "Generate Edits". The AI will return the complete, modified code.
    5.  A diff view will show you the changes.
    6.  If the changes are correct, click "Save Changes" to update the app's files.

### 2. Manual/Hybrid Workflow

This workflow uses the **App Builder** and **App Manager** and is useful if you want to use an external LLM (like ChatGPT) or write all the code yourself.

*   **To Create an App (App Builder):**
    1.  Navigate to the **App Builder** (`/app-builder`).
    2.  Enter an "App Name".
    3.  Click the "Generate LLM Prompt" button and describe your idea.
    4.  Copy the generated prompt and paste it into your external LLM.
    5.  The LLM will provide code for four files. Copy each code block and paste it into the corresponding textarea in the App Builder.
    6.  Click "Create App".

*   **To Edit or Delete an App (App Manager):**
    1.  Navigate to the **App Manager** (`/app-manager`).
    2.  Select an app from the dropdown. Its source code will load into the editors.
    3.  **To Edit Manually:** Make your changes directly in the textareas and click "Save Changes".
    4.  **To Edit with an LLM:** Click "Generate Context" and then "Create LLM Prompt". This gives you a complete prompt to use in an external LLM. Paste the AI's response back into the textareas and save.
    5.  **To Delete:** Click the "Delete This App" button and confirm by typing the app's name. This will remove the app's files and its routes from `server.js`.

## Architecture Deep Dive

The system is designed for simplicity and modularity.

*   **Main Server (`server.js`):** The entry point of the project. It uses Express.js to act as a hub. Its primary responsibility is to mount each application's front-end and back-end routes. It contains a `// {{APP_MOUNT_POINT}}` marker that the App Builder and App Manager use to dynamically inject and remove routing code.

*   **App Directory Structure:** Every application must exist within the `apps/` directory and follow a strict, simple structure. The `<app-slug>` is the unique, URL-friendly name for the app.
    ```
    apps/
    └── <app-slug>/
        ├── routes.js        # Backend API Logic
        └── public/          # All frontend files
            ├── index.html
            ├── script.js
            └── style.css
    ```
*   **Routing:** The main `server.js` file automatically adds two routes for each application:
    *   **Frontend:** `app.use('/<app-slug>', ...)` makes the `public` directory available at `http://localhost:3000/<app-slug>`.
    *   **Backend:** `app.use('/api/<app-slug>', ...)` prefixes all routes from `routes.js`. A route like `router.get('/data', ...)` becomes accessible at `http://localhost:3000/api/<app-slug>/data`.

This separation ensures that frontend and backend routes for different apps never conflict.

## License

Easy: For personal use, keep money out of it.
