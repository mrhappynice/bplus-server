#!/usr/bin/env python
import argparse
import sys
from pathlib import Path

# This is the full LLM prompt template.
# It uses f-string placeholders like {app_slug}, {request}, etc.
PROMPT_TEMPLATE = """
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

**My Request:** {request}

Below are the complete files for the app named **`{app_slug}`**. Please modify them according to my request.

--- START OF FILE apps/{app_slug}/routes.js ---
{routes_js}
--- END OF FILE apps/{app_slug}/routes.js ---

--- START OF FILE apps/{app_slug}/public/index.html ---
{index_html}
--- END OF FILE apps/{app_slug}/public/index.html ---

--- START OF FILE apps/{app_slug}/public/script.js ---
{script_js}
--- END OF FILE apps/{app_slug}/public/script.js ---

--- START OF FILE apps/{app_slug}/public/style.css ---
{style_css}
--- END OF FILE apps/{app_slug}/public/style.css ---

### Output Format

Your response MUST be only the complete, modified files, formatted exactly as shown below. If a file is unchanged, include it as-is. Provide all four files in your response. Briefly explain your changes in the "Reasoning" section at the end.

--- START OF FILE apps/{app_slug}/routes.js ---
(Your modified code for routes.js here)
--- END OF FILE apps/{app_slug}/routes.js ---

--- START OF FILE apps/{app_slug}/public/index.html ---
(Your modified code for index.html here)
--- END OF FILE apps/{app_slug}/public/index.html ---

--- START OF FILE apps/{app_slug}/public/script.js ---
(Your modified code for script.js here)
--- END OF FILE apps/{app_slug}/public/script.js ---

--- START OF FILE apps/{app_slug}/public/style.css ---
(Your modified code for style.css here)
--- END OF FILE apps/{app_slug}/public/style.css ---

--- REASONING ---
(Your brief explanation of the changes made.)
"""

def read_file_content(file_path: Path) -> str:
    """
    Safely reads the content of a file.
    If the file is not found, prints an error and exits the script.
    """
    try:
        with file_path.open('r', encoding='utf-8') as f:
            return f.read()
    except FileNotFoundError:
        print(f"Error: File not found at '{file_path}'.", file=sys.stderr)
        print("Please ensure the app name is correct and you are running the script from the 'apps' directory.", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"An unexpected error occurred while reading '{file_path}': {e}", file=sys.stderr)
        sys.exit(1)

def main():
    """
    Main function to parse arguments, read files, and generate the prompt.
    """
    parser = argparse.ArgumentParser(
        description="Generate a standardized LLM prompt for editing an app within the project.",
        epilog="Example: python generate_prompt.py test-app \"Change the h1 text to 'My New Title'\""
    )
    parser.add_argument(
        "app_name",
        help="The directory name of the app you want to edit (e.g., 'test-app')."
    )
    parser.add_argument(
        "changes",
        help="A detailed description of the changes you want to make, enclosed in quotes."
    )
    args = parser.parse_args()

    app_name = args.app_name
    changes_request = args.changes
    
    # The script assumes it's being run from the 'apps' directory.
    base_path = Path(app_name)
    
    if not base_path.is_dir():
        print(f"Error: Directory '{app_name}' does not exist in the current location.", file=sys.stderr)
        print("Please make sure you are in the 'apps' directory and the app name is correct.", file=sys.stderr)
        sys.exit(1)

    # Define paths for the four standard files
    file_paths = {
        "routes_js": base_path / "routes.js",
        "index_html": base_path / "public" / "index.html",
        "script_js": base_path / "public" / "script.js",
        "style_css": base_path / "public" / "style.css",
    }
    
    # Read the content of each file
    file_contents = {key: read_file_content(path) for key, path in file_paths.items()}

    # Populate the template with the collected information
    final_prompt = PROMPT_TEMPLATE.format(
        app_slug=app_name,
        request=changes_request,
        routes_js=file_contents["routes_js"],
        index_html=file_contents["index_html"],
        script_js=file_contents["script_js"],
        style_css=file_contents["style_css"],
    )
    
    # Print the final prompt to the console
    print(final_prompt)

if __name__ == "__main__":
    main()