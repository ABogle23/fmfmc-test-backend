Project Setup Instructions

OpenAPI docs in yaml and json format are available in the root folder or via the endpoints '/v3/api-docs' and '/v3/api-docs.yaml'.

Prerequisites:
- IDE with preview: Ensure you have a MySQL server running (locally or hosted) w/ MySQL 8.0 or above.
- API Keys for the following: Feed me Feed my Car, Mapbox.

Setup Instructions

1. Clone the Repository
'git clone git@github.com:ABogle23/fmfmc-test-backend.git'

2. Open the project in your IDE

3. Configure the keys-template.js file
- Add your API keys to the keys-template.js file.
- Rename the keys-template.js file to keys.js.

4. Preview the application
- In preview mode open the index.html file in your browser.
- For IntelliJ: https://www.jetbrains.com/help/idea/editing-html-files.html#open-in-preview-browser-procedure
- For VSCode: https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer

5. Test the application
- Complete the form and click the 'Find Journey' button.
- The application will call FmFmC and display the results of the form submission.