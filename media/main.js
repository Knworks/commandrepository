// media/main.js

// @ts-ignore
const vscode = acquireVsCodeApi();

let currentItem = null;

// --- DOM Elements ---
const viewContainer = document.getElementById('view-container');
const readOnlyView = document.getElementById('read-only-view');
const editView = document.getElementById('edit-view');
const placeholderView = document.getElementById('placeholder');

// Read-only fields
const typeRo = document.getElementById('type-ro');
const labelRo = document.getElementById('label-ro');
const commandRo = document.getElementById('command-ro');
const descriptionRo = document.getElementById('description-ro');
const parameterRo = document.getElementById('parameter-ro');
const commandContainerRo = document.getElementById('command-container-ro');
const descriptionContainerRo = document.getElementById('description-container-ro');
const parameterContainerRo = document.getElementById('parameter-container-ro');

// --- Event Listeners ---

window.addEventListener('message', event => {
    const message = event.data;
    switch (message.type) {
        case 'update':
            currentItem = message.item;
            render('read');
            break;
        default:
            currentItem = null;
            render('placeholder');
            break;
    }
});

// --- Render Logic ---

function render(mode) {
    hideAllViews();

    if (mode === 'placeholder' || !currentItem) {
        placeholderView.style.display = 'block';
        return;
    }
    
    viewContainer.style.display = 'block';
    populateReadOnlyFields();
    readOnlyView.style.display = 'block';
}

function populateReadOnlyFields() {
    if (!currentItem) return;
    
    typeRo.textContent = currentItem.type;

    if (currentItem.type === 'command') {
        commandRo.textContent = currentItem.command;
        parameterRo.textContent = currentItem.parameter || '';
        descriptionRo.textContent = currentItem.description || '';
        commandContainerRo.style.display = 'block';
        parameterContainerRo.style.display = 'block';
        descriptionContainerRo.style.display = 'block';
    } else { // category
        commandContainerRo.style.display = 'none';
        parameterContainerRo.style.display = 'none';
        descriptionContainerRo.style.display = 'none';
    }
}

function hideAllViews() {
    readOnlyView.style.display = 'none';
    editView.style.display = 'none';
    placeholderView.style.display = 'none';
}

// --- Initial State ---
vscode.postMessage({ type: 'webviewLoaded' });
render('placeholder');
