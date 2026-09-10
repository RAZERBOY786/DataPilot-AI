/* =====================================================
   DATAPILOT AI - FRONTEND SCRIPT
===================================================== */

const API_URL =
    "https://datapilot-ai-debdut-nandy.onrender.com";


/* =====================================================
   GLOBAL STATE
===================================================== */

let datasetId = null;
let cleanedDatasetId = null;
let selectedFile = null;
let cleaningSuggestions = [];
let activeCharts = [];

let aiConversationHistory = [];
let aiIsSending = false;


/* =====================================================
   DOM ELEMENTS - UPLOAD
===================================================== */

const fileInput =
    document.getElementById("file-input");

const chooseFileButton =
    document.getElementById("choose-file-btn");

const uploadButton =
    document.getElementById("upload-btn");

const uploadArea =
    document.getElementById("upload-area");

const selectedFileContainer =
    document.getElementById("selected-file");

const selectedFileName =
    document.getElementById("selected-file-name");


/* =====================================================
   DOM ELEMENTS - NAVIGATION
===================================================== */

const navItems =
    document.querySelectorAll(".nav-item");

const contentSections =
    document.querySelectorAll(".content-section");

const pageTitle =
    document.getElementById("page-title");


/* =====================================================
   DOM ELEMENTS - AI ASSISTANT
===================================================== */

const aiChatMessages =
    document.getElementById("ai-chat-messages");

const aiQuestionInput =
    document.getElementById("ai-question-input");

const aiSendButton =
    document.getElementById("ai-send-btn");

const aiDatasetStatus =
    document.getElementById("ai-dataset-status");


/* =====================================================
   SAFE JSON RESPONSE HELPER
===================================================== */

async function getResponseData(response) {

    const responseText =
        await response.text();

    if (!responseText) {
        return {};
    }

    try {

        return JSON.parse(responseText);

    } catch (error) {

        console.error(
            "Invalid JSON response:",
            responseText
        );

        throw new Error(
            "Server returned an invalid response."
        );

    }

}


/* =====================================================
   NAVIGATION
===================================================== */

navItems.forEach(item => {

    item.addEventListener(
        "click",
        () => {

            const section =
                item.dataset.section;


            navItems.forEach(nav =>
                nav.classList.remove("active")
            );


            contentSections.forEach(content =>
                content.classList.remove("active")
            );


            item.classList.add("active");


            const selectedSection =
                document.getElementById(section);


            if (selectedSection) {

                selectedSection.classList.add(
                    "active"
                );

            }


            if (pageTitle) {

                pageTitle.textContent =
                    item.textContent.trim();

            }


            if (section === "datasets") {

                loadDatasets();

            }

        }
    );

});


/* =====================================================
   FILE SELECTION
===================================================== */

if (chooseFileButton && fileInput) {

    chooseFileButton.addEventListener(
        "click",
        () => fileInput.click()
    );

}


if (fileInput) {

    fileInput.addEventListener(
        "change",
        event => {

            const file =
                event.target.files[0];


            if (!file) {
                return;
            }


            setSelectedFile(file);

        }
    );

}


function setSelectedFile(file) {

    selectedFile = file;


    if (selectedFileName) {

        selectedFileName.textContent =
            file.name;

    }


    if (selectedFileContainer) {

        selectedFileContainer.classList.remove(
            "hidden"
        );

    }

}


/* =====================================================
   DRAG AND DROP
===================================================== */

if (uploadArea) {

    uploadArea.addEventListener(
        "dragover",
        event => {

            event.preventDefault();

            uploadArea.classList.add(
                "drag-over"
            );

        }
    );


    uploadArea.addEventListener(
        "dragleave",
        () => {

            uploadArea.classList.remove(
                "drag-over"
            );

        }
    );


    uploadArea.addEventListener(
        "drop",
        event => {

            event.preventDefault();


            uploadArea.classList.remove(
                "drag-over"
            );


            const file =
                event.dataTransfer.files[0];


            if (!file) {
                return;
            }


            setSelectedFile(file);

        }
    );

}


/* =====================================================
   UPLOAD DATASET
===================================================== */

if (uploadButton) {

    uploadButton.addEventListener(
        "click",
        uploadDataset
    );

}


async function uploadDataset() {

    if (!selectedFile) {

        alert(
            "Please select a dataset first."
        );

        return;

    }


    const formData =
        new FormData();


    formData.append(
        "file",
        selectedFile
    );


    if (uploadButton) {

        uploadButton.textContent =
            "Uploading...";

        uploadButton.disabled =
            true;

    }


    try {

        const response =
            await fetch(
                `${API_URL}/upload/`,
                {
                    method: "POST",
                    body: formData
                }
            );


        const data =
            await getResponseData(
                response
            );


        if (!response.ok) {

            throw new Error(
                data.detail ||
                "Upload failed."
            );

        }


        datasetId =
            data.dataset_id;


        cleanedDatasetId =
            null;


        aiConversationHistory =
            [];


        updateActiveDatasetUI(
            data.filename
        );


        updateAIDatasetStatus(
            data.filename
        );


        displayUploadResult(
            data
        );


        displayDatasetPreview(
            data
        );


        await loadDatasets();


        alert(
            "Dataset uploaded successfully!"
        );

    } catch (error) {

        console.error(
            "Upload Error:",
            error
        );


        alert(
            "Upload Error: " +
            error.message
        );

    } finally {

        if (uploadButton) {

            uploadButton.textContent =
                "Upload Dataset";

            uploadButton.disabled =
                false;

        }

    }

}


/* =====================================================
   DISPLAY UPLOAD RESULT
===================================================== */

function displayUploadResult(data) {

    const container =
        document.getElementById(
            "upload-result"
        );


    if (!container) {
        return;
    }


    const columns =
        data.column_names || [];


    container.innerHTML = `

        <div class="result-card">

            <h2>
                Dataset Uploaded Successfully
            </h2>


            <div class="stats-grid">

                <div class="stat-card">

                    <h3>
                        ${data.rows ?? 0}
                    </h3>

                    <p>
                        Rows
                    </p>

                </div>


                <div class="stat-card">

                    <h3>
                        ${data.columns ?? 0}
                    </h3>

                    <p>
                        Columns
                    </p>

                </div>

            </div>


            <h3>
                Columns
            </h3>


            <div class="column-list">

                ${columns.map(
                    column => `

                        <span class="column-tag">

                            ${escapeHtml(column)}

                        </span>

                    `
                ).join("")}

            </div>

        </div>

    `;

}


/* =====================================================
   DATASET PREVIEW
===================================================== */

function displayDatasetPreview(data) {

    const container =
        document.getElementById(
            "dataset-preview-container"
        );


    if (!container) {
        return;
    }


    if (
        !data.preview ||
        data.preview.length === 0
    ) {
        return;
    }


    const columns =
        data.column_names || [];


    let html = `

        <div class="preview-card">

            <h2>
                Dataset Preview
            </h2>


            <div class="table-wrapper">

                <table>

                    <thead>

                        <tr>

    `;


    columns.forEach(column => {

        html += `

            <th>

                ${escapeHtml(column)}

            </th>

        `;

    });


    html += `

                        </tr>

                    </thead>


                    <tbody>

    `;


    data.preview.forEach(row => {

        html += "<tr>";


        columns.forEach(column => {

            const value =
                row[column] ?? "—";


            html += `

                <td>

                    ${escapeHtml(
                        String(value)
                    )}

                </td>

            `;

        });


        html += "</tr>";

    });


    html += `

                    </tbody>

                </table>

            </div>

        </div>

    `;


    container.innerHTML =
        html;

}


/* =====================================================
   ACTIVE DATASET UI
===================================================== */

function updateActiveDatasetUI(filename) {

    const activeDatasetLabel =
        document.getElementById(
            "active-dataset-label"
        );


    const datasetStatus =
        document.getElementById(
            "dataset-status"
        );


    if (activeDatasetLabel) {

        activeDatasetLabel.textContent =
            `Active: ${filename}`;

    }


    if (datasetStatus) {

        datasetStatus.textContent =
            "Dataset Active";

    }


    updateAIDatasetStatus(
        filename
    );

}


/* =====================================================
   PROFILE
===================================================== */

const generateProfileButton =
    document.getElementById(
        "generate-profile-btn"
    );


if (generateProfileButton) {

    generateProfileButton.addEventListener(
        "click",
        generateProfile
    );

}


async function generateProfile() {

    if (!datasetId) {

        alert(
            "Please upload or select a dataset first."
        );

        return;

    }


    const container =
        document.getElementById(
            "profile-content"
        );


    if (!container) {
        return;
    }


    container.innerHTML = `

        <div class="empty-state">

            Generating dataset profile...

        </div>

    `;


    try {

        const response =
            await fetch(
                `${API_URL}/profile/${datasetId}`
            );


        const data =
            await getResponseData(
                response
            );


        if (!response.ok) {

            throw new Error(
                data.detail ||
                "Profile generation failed."
            );

        }


        displayProfile(
            data.profile
        );

    } catch (error) {

        container.innerHTML = `

            <div class="empty-state">

                Profile Error:

                <br>

                ${escapeHtml(
                    error.message
                )}

            </div>

        `;

    }

}


function displayProfile(profile) {

    const container =
        document.getElementById(
            "profile-content"
        );


    if (!container || !profile) {
        return;
    }


    let html = `

        <div class="result-card">

            <h2>
                Dataset Overview
            </h2>


            <div class="stats-grid">

                <div class="stat-card">

                    <h3>
                        ${profile.rows ?? 0}
                    </h3>

                    <p>
                        Rows
                    </p>

                </div>


                <div class="stat-card">

                    <h3>
                        ${profile.columns ?? 0}
                    </h3>

                    <p>
                        Columns
                    </p>

                </div>


                <div class="stat-card">

                    <h3>
                        ${profile.missing_values ?? 0}
                    </h3>

                    <p>
                        Missing Values
                    </p>

                </div>


                <div class="stat-card">

                    <h3>
                        ${profile.duplicate_rows ?? 0}
                    </h3>

                    <p>
                        Duplicates
                    </p>

                </div>

            </div>

        </div>


        <div class="result-card">

            <h2>
                Column Information
            </h2>

    `;


    Object.entries(
        profile.column_info || {}
    ).forEach(
        ([column, info]) => {

            html += `

                <div class="profile-column-card">

                    <h3>

                        ${escapeHtml(
                            column
                        )}

                    </h3>


                    <p>

                        <strong>
                            Data Type:
                        </strong>

                        ${escapeHtml(
                            String(
                                info.dtype ??
                                "—"
                            )
                        )}

                    </p>


                    <p>

                        <strong>
                            Missing Values:
                        </strong>

                        ${info.missing_values ?? "—"}

                    </p>


                    <p>

                        <strong>
                            Unique Values:
                        </strong>

                        ${info.unique_values ?? "—"}

                    </p>

                </div>

            `;

        }
    );


    html += `

        </div>

    `;


    container.innerHTML =
        html;

}


/* =====================================================
   CLEANING ANALYSIS
===================================================== */

const analyzeCleaningButton =
    document.getElementById(
        "analyze-cleaning-btn"
    );


if (analyzeCleaningButton) {

    analyzeCleaningButton.addEventListener(
        "click",
        analyzeCleaning
    );

}


async function analyzeCleaning() {

    if (!datasetId) {

        alert(
            "Please upload or select a dataset first."
        );

        return;

    }


    const container =
        document.getElementById(
            "cleaning-content"
        );


    if (!container) {
        return;
    }


    container.innerHTML = `

        <div class="empty-state">

            Analyzing dataset...

        </div>

    `;


    try {

        const response =
            await fetch(
                `${API_URL}/cleaning/suggestions/${datasetId}`
            );


        const data =
            await getResponseData(
                response
            );


        if (!response.ok) {

            throw new Error(
                data.detail ||
                "Cleaning analysis failed."
            );

        }


        displayCleaningSuggestions(
            data
        );

    } catch (error) {

        container.innerHTML = `

            <div class="empty-state">

                Cleaning Analysis Error:

                <br>

                ${escapeHtml(
                    error.message
                )}

            </div>

        `;

    }

}


function displayCleaningSuggestions(data) {

    cleaningSuggestions =
        data.suggestions || [];


    const container =
        document.getElementById(
            "cleaning-content"
        );


    if (!container) {
        return;
    }


    if (
        cleaningSuggestions.length === 0
    ) {

        container.innerHTML = `

            <div class="empty-state">

                Your dataset looks clean!

            </div>

        `;

        return;

    }


    container.innerHTML =
        "";


    cleaningSuggestions.forEach(
        (suggestion, index) => {

            const card =
                document.createElement(
                    "div"
                );


            card.className =
                "suggestion-card";


            card.innerHTML = `

                <h3>

                    ${escapeHtml(
                        String(
                            suggestion.issue ||
                            "Data Issue"
                        ).replaceAll(
                            "_",
                            " "
                        )
                    )}

                </h3>


                <pre>

                    ${escapeHtml(
                        JSON.stringify(
                            suggestion,
                            null,
                            2
                        )
                    )}

                </pre>


                <button
                    class="primary-btn apply-single-btn"
                    data-index="${index}"
                >

                    Apply This Fix

                </button>

            `;


            container.appendChild(
                card
            );

        }
    );


    document
        .querySelectorAll(
            ".apply-single-btn"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        applySingleCleaning(
                            cleaningSuggestions[
                                Number(
                                    button.dataset.index
                                )
                            ]
                        );

                    }
                );

            }
        );

}


/* =====================================================
   CLEANING OPERATIONS
===================================================== */

function suggestionToOperation(
    suggestion
) {

    if (
        suggestion.issue ===
        "missing_values"
    ) {

        return {

            type:
                "fill_missing",

            column:
                suggestion.column,

            strategy:
                suggestion.recommended_action

        };

    }


    if (
        suggestion.issue ===
        "duplicate_rows"
    ) {

        return {

            type:
                "remove_duplicates"

        };

    }


    if (
        suggestion.issue ===
        "potential_outliers"
    ) {

        return {

            type:
                "cap_outliers",

            column:
                suggestion.column

        };

    }


    return null;

}


async function applySingleCleaning(
    suggestion
) {

    const operation =
        suggestionToOperation(
            suggestion
        );


    if (!operation) {

        alert(
            "Unsupported cleaning operation."
        );

        return;

    }


    try {

        const response =
            await fetch(
                `${API_URL}/cleaning/apply/${datasetId}`,
                {

                    method:
                        "POST",

                    headers: {

                        "Content-Type":
                            "application/json"

                    },

                    body:
                        JSON.stringify({

                            operations:
                                [operation]

                        })

                }
            );


        const data =
            await getResponseData(
                response
            );


        if (!response.ok) {

            throw new Error(
                data.detail ||
                "Cleaning failed."
            );

        }


        displayCleaningResult(
            data
        );

    } catch (error) {

        alert(
            "Cleaning Error: " +
            error.message
        );

    }

}


const applyAllCleaningButton =
    document.getElementById(
        "apply-all-cleaning-btn"
    );


if (applyAllCleaningButton) {

    applyAllCleaningButton.addEventListener(
        "click",
        applyAllCleaning
    );

}


async function applyAllCleaning() {

    if (!datasetId) {

        alert(
            "Please upload or select a dataset first."
        );

        return;

    }


    if (applyAllCleaningButton) {

        applyAllCleaningButton.textContent =
            "Cleaning Dataset...";

        applyAllCleaningButton.disabled =
            true;

    }


    try {

        const response =
            await fetch(
                `${API_URL}/cleaning/apply-recommended/${datasetId}`,
                {
                    method:
                        "POST"
                }
            );


        const data =
            await getResponseData(
                response
            );


        if (!response.ok) {

            throw new Error(
                data.detail ||
                "Cleaning failed."
            );

        }


        displayCleaningResult(
            data
        );

    } catch (error) {

        alert(
            "Cleaning Error: " +
            error.message
        );

    } finally {

        if (applyAllCleaningButton) {

            applyAllCleaningButton.textContent =
                "Apply All Recommendations";

            applyAllCleaningButton.disabled =
                false;

        }

    }

}


function displayCleaningResult(data) {

    cleanedDatasetId =
        data.cleaned_dataset_id;


    datasetId =
        cleanedDatasetId;


    aiConversationHistory =
        [];


    updateAIDatasetStatus(
        "Cleaned Dataset"
    );


    loadDatasets();


    const container =
        document.getElementById(
            "cleaning-content"
        );


    if (!container) {
        return;
    }


    container.innerHTML = `

        <div class="cleaning-result">

            <h2>
                Cleaning Completed Successfully
            </h2>


            <div class="before-after-grid">

                <div class="comparison-card">

                    <h3>
                        Before Cleaning
                    </h3>

                    <p>
                        Rows:
                        ${data.before?.rows ?? 0}
                    </p>

                    <p>
                        Columns:
                        ${data.before?.columns ?? 0}
                    </p>

                    <p>
                        Missing Values:
                        ${data.before?.missing_values ?? 0}
                    </p>

                    <p>
                        Duplicate Rows:
                        ${data.before?.duplicate_rows ?? 0}
                    </p>

                </div>


                <div class="comparison-card">

                    <h3>
                        After Cleaning
                    </h3>

                    <p>
                        Rows:
                        ${data.after?.rows ?? 0}
                    </p>

                    <p>
                        Columns:
                        ${data.after?.columns ?? 0}
                    </p>

                    <p>
                        Missing Values:
                        ${data.after?.missing_values ?? 0}
                    </p>

                    <p>
                        Duplicate Rows:
                        ${data.after?.duplicate_rows ?? 0}
                    </p>

                </div>

            </div>


            <a
                class="download-btn"
                href="${API_URL}/cleaning/download/${cleanedDatasetId}"
                target="_blank"
                rel="noopener noreferrer"
            >

                Download Cleaned Dataset

            </a>

        </div>

    `;

}


/* =====================================================
   EDA
===================================================== */

const generateEDAButton =
    document.getElementById(
        "generate-eda-btn"
    );


if (generateEDAButton) {

    generateEDAButton.addEventListener(
        "click",
        generateEDA
    );

}


async function generateEDA() {

    if (!datasetId) {

        alert(
            "Please upload or select a dataset first."
        );

        return;

    }


    const contentContainer =
        document.getElementById(
            "eda-content"
        );


    const chartsContainer =
        document.getElementById(
            "eda-charts-container"
        );


    const insightsContainer =
        document.getElementById(
            "eda-insights-container"
        );


    if (
        !contentContainer ||
        !chartsContainer ||
        !insightsContainer
    ) {
        return;
    }


    contentContainer.innerHTML = `

        <div class="empty-state">

            Running automated EDA...

        </div>

    `;


    chartsContainer.innerHTML =
        "";


    insightsContainer.innerHTML =
        "";


    try {

        const response =
            await fetch(
                `${API_URL}/eda/${datasetId}`
            );


        const data =
            await getResponseData(
                response
            );


        if (!response.ok) {

            throw new Error(
                data.detail ||
                "EDA failed."
            );

        }


        renderVisualEDA(
            data.eda
        );

    } catch (error) {

        contentContainer.innerHTML = `

            <div class="empty-state">

                EDA Error:

                <br>

                ${escapeHtml(
                    error.message
                )}

            </div>

        `;

    }

}


/* =====================================================
   DESTROY CHARTS
===================================================== */

function destroyCharts() {

    activeCharts.forEach(
        chart => {

            try {

                chart.destroy();

            } catch (error) {

                console.warn(
                    "Chart destroy error:",
                    error
                );

            }

        }
    );


    activeCharts =
        [];

}


/* =====================================================
   RENDER VISUAL EDA
===================================================== */

function renderVisualEDA(eda) {

    if (!eda) {
        return;
    }


    destroyCharts();


    const contentContainer =
        document.getElementById(
            "eda-content"
        );


    const chartsContainer =
        document.getElementById(
            "eda-charts-container"
        );


    const insightsContainer =
        document.getElementById(
            "eda-insights-container"
        );


    if (
        !contentContainer ||
        !chartsContainer ||
        !insightsContainer
    ) {
        return;
    }


    contentContainer.innerHTML = `

        <div class="eda-overview-grid">

            <div class="eda-overview-card">

                <h2>
                    ${eda.rows ?? 0}
                </h2>

                <p>
                    Total Rows
                </p>

            </div>


            <div class="eda-overview-card">

                <h2>
                    ${eda.columns ?? 0}
                </h2>

                <p>
                    Total Columns
                </p>

            </div>


            <div class="eda-overview-card">

                <h2>
                    ${eda.missing_values ?? 0}
                </h2>

                <p>
                    Missing Values
                </p>

            </div>


            <div class="eda-overview-card">

                <h2>
                    ${eda.duplicate_rows ?? 0}
                </h2>

                <p>
                    Duplicate Rows
                </p>

            </div>

        </div>

    `;


    chartsContainer.innerHTML =
        "";


    insightsContainer.innerHTML =
        "";


    const chartGrid =
        document.createElement(
            "div"
        );


    chartGrid.className =
        "eda-chart-grid";


    chartsContainer.appendChild(
        chartGrid
    );


    Object.entries(
        eda.numeric_summary || {}
    ).forEach(
        ([column, stats]) => {

            createNumericChart(
                chartGrid,
                column,
                stats
            );

        }
    );


    Object.entries(
        eda.categorical_summary || {}
    ).forEach(
        ([column, values]) => {

            createCategoricalChart(
                chartGrid,
                column,
                values
            );

        }
    );


    createMissingValuesChart(
        chartGrid,
        eda.missing_by_column || {}
    );


    renderCorrelationTable(
        chartsContainer,
        eda.correlations || {}
    );


    generateInsights(
        eda,
        insightsContainer
    );

}


/* =====================================================
   NUMERIC CHART
===================================================== */

function createNumericChart(
    container,
    column,
    stats
) {

    if (typeof Chart === "undefined") {
        return;
    }


    const card =
        document.createElement(
            "div"
        );


    card.className =
        "eda-chart-card";


    const canvas =
        document.createElement(
            "canvas"
        );


    card.innerHTML = `

        <h3>

            ${escapeHtml(column)}
            Statistics

        </h3>


        <div class="chart-container">

        </div>

    `;


    card
        .querySelector(
            ".chart-container"
        )
        .appendChild(
            canvas
        );


    container.appendChild(
        card
    );


    const chart =
        new Chart(
            canvas,
            {

                type:
                    "bar",

                data: {

                    labels: [
                        "Min",
                        "Mean",
                        "Median",
                        "Max"
                    ],

                    datasets: [{

                        label:
                            column,

                        data: [

                            stats.min ?? 0,

                            stats.mean ?? 0,

                            stats.median ?? 0,

                            stats.max ?? 0

                        ]

                    }]

                },

                options: {

                    responsive:
                        true,

                    maintainAspectRatio:
                        false

                }

            }
        );


    activeCharts.push(
        chart
    );

}


/* =====================================================
   CATEGORICAL CHART
===================================================== */

function createCategoricalChart(
    container,
    column,
    values
) {

    if (typeof Chart === "undefined") {
        return;
    }


    const card =
        document.createElement(
            "div"
        );


    card.className =
        "eda-chart-card";


    const canvas =
        document.createElement(
            "canvas"
        );


    card.innerHTML = `

        <h3>

            ${escapeHtml(column)}
            Distribution

        </h3>


        <div class="chart-container">

        </div>

    `;


    card
        .querySelector(
            ".chart-container"
        )
        .appendChild(
            canvas
        );


    container.appendChild(
        card
    );


    const chart =
        new Chart(
            canvas,
            {

                type:
                    "bar",

                data: {

                    labels:
                        Object.keys(
                            values || {}
                        ),

                    datasets: [{

                        label:
                            "Count",

                        data:
                            Object.values(
                                values || {}
                            )

                    }]

                },

                options: {

                    responsive:
                        true,

                    maintainAspectRatio:
                        false

                }

            }
        );


    activeCharts.push(
        chart
    );

}


/* =====================================================
   MISSING VALUES CHART
===================================================== */

function createMissingValuesChart(
    container,
    missingData
) {

    if (typeof Chart === "undefined") {
        return;
    }


    const entries =
        Object.entries(
            missingData
        ).filter(
            ([, value]) =>
                value > 0
        );


    if (
        entries.length === 0
    ) {
        return;
    }


    const card =
        document.createElement(
            "div"
        );


    card.className =
        "eda-chart-card";


    const canvas =
        document.createElement(
            "canvas"
        );


    card.innerHTML = `

        <h3>
            Missing Values
        </h3>

        <div class="chart-container">

        </div>

    `;


    card
        .querySelector(
            ".chart-container"
        )
        .appendChild(
            canvas
        );


    container.appendChild(
        card
    );


    const chart =
        new Chart(
            canvas,
            {

                type:
                    "bar",

                data: {

                    labels:
                        entries.map(
                            entry =>
                                entry[0]
                        ),

                    datasets: [{

                        label:
                            "Missing Values",

                        data:
                            entries.map(
                                entry =>
                                    entry[1]
                            )

                    }]

                },

                options: {

                    responsive:
                        true,

                    maintainAspectRatio:
                        false

                }

            }
        );


    activeCharts.push(
        chart
    );

}


/* =====================================================
   CORRELATION TABLE
===================================================== */

function renderCorrelationTable(
    container,
    correlations
) {

    const columns =
        Object.keys(
            correlations || {}
        );


    if (
        columns.length === 0
    ) {
        return;
    }


    const card =
        document.createElement(
            "div"
        );


    card.className =
        "result-card";


    let html = `

        <h2>
            Correlation Matrix
        </h2>


        <div class="correlation-table-wrapper">

            <table class="correlation-table">

                <thead>

                    <tr>

                        <th>
                            Column
                        </th>

    `;


    columns.forEach(
        column => {

            html += `

                <th>

                    ${escapeHtml(
                        column
                    )}

                </th>

            `;

        }
    );


    html += `

                    </tr>

                </thead>


                <tbody>

    `;


    columns.forEach(
        rowColumn => {

            html += `

                <tr>

                    <th>

                        ${escapeHtml(
                            rowColumn
                        )}

                    </th>

            `;


            columns.forEach(
                column => {

                    const value =
                        correlations[
                            rowColumn
                        ]?.[
                            column
                        ];


                    html += `

                        <td>

                            ${
                                value === null ||
                                value === undefined
                                    ? "-"
                                    : Number(
                                        value
                                    ).toFixed(2)
                            }

                        </td>

                    `;

                }
            );


            html += "</tr>";

        }
    );


    html += `

                </tbody>

            </table>

        </div>

    `;


    card.innerHTML =
        html;


    container.appendChild(
        card
    );

}


/* =====================================================
   GENERATE SMART INSIGHTS
===================================================== */

function generateInsights(
    eda,
    container
) {

    const insights =
        [];


    Object.entries(
        eda.missing_by_column || {}
    ).forEach(
        ([column, value]) => {

            if (value > 0) {

                insights.push(
                    `${column} contains ${value} missing values.`
                );

            }

        }
    );


    if (
        eda.duplicate_rows > 0
    ) {

        insights.push(
            `The dataset contains ${eda.duplicate_rows} duplicate rows.`
        );

    }


    const numericCount =
        Object.keys(
            eda.numeric_summary || {}
        ).length;


    const categoricalCount =
        Object.keys(
            eda.categorical_summary || {}
        ).length;


    if (numericCount > 0) {

        insights.push(
            `The dataset contains ${numericCount} numeric columns suitable for statistical analysis.`
        );

    }


    if (categoricalCount > 0) {

        insights.push(
            `The dataset contains ${categoricalCount} categorical columns that may reveal useful patterns.`
        );

    }


    if (
        insights.length === 0
    ) {

        insights.push(
            "No major data quality issues were automatically detected."
        );

    }


    container.innerHTML = `

        <div class="insight-card">

            <h2>
                Smart Insights
            </h2>


            <ul class="insight-list">

                ${insights.map(
                    insight => `

                        <li>

                            ${escapeHtml(
                                insight
                            )}

                        </li>

                    `
                ).join("")}

            </ul>

        </div>

    `;

}


/* =====================================================
   DATASET MANAGEMENT
===================================================== */

async function loadDatasets() {

    const container =
        document.getElementById(
            "datasets-container"
        );


    const activeInfo =
        document.getElementById(
            "active-dataset-info"
        );


    if (!container) {
        return;
    }


    try {

        const response =
            await fetch(
                `${API_URL}/datasets/`
            );


        const data =
            await getResponseData(
                response
            );


        if (!response.ok) {

            throw new Error(
                data.detail ||
                "Failed to load datasets."
            );

        }


        const datasets =
            data.datasets || [];


        const activeDatasetId =
            data.active_dataset;


        if (
            datasets.length === 0
        ) {

            if (activeInfo) {

                activeInfo.textContent =
                    "No active dataset selected.";

            }


            container.innerHTML = `

                <div class="empty-state">

                    Upload a dataset to start.

                </div>

            `;


            updateAIDatasetStatus(
                null
            );


            return;

        }


        const activeDataset =
            datasets.find(
                dataset =>
                    dataset.dataset_id ===
                    activeDatasetId
            );


        if (activeDataset) {

            datasetId =
                activeDataset.dataset_id;


            if (activeInfo) {

                activeInfo.innerHTML = `

                    <strong>
                        Active Dataset:
                    </strong>

                    ${escapeHtml(
                        activeDataset.filename
                    )}

                    <span class="active-badge">
                        ACTIVE
                    </span>

                `;

            }


            updateActiveDatasetUI(
                activeDataset.filename
            );


            updateAIDatasetStatus(
                activeDataset.filename
            );

        }


        container.innerHTML =
            "";


        datasets.forEach(
            dataset => {

                const card =
                    document.createElement(
                        "div"
                    );


                card.className =
                    "dataset-card";


                const isActive =
                    dataset.dataset_id ===
                    activeDatasetId;


                if (isActive) {

                    card.classList.add(
                        "active"
                    );

                }


                const parentInfo =
                    dataset.parent_dataset
                        ? `

                            <p class="dataset-meta">

                                <strong>
                                    Parent Dataset:
                                </strong>

                                ${escapeHtml(
                                    dataset.parent_dataset
                                )}

                            </p>

                        `
                        : `

                            <p class="dataset-meta">

                                Original uploaded dataset.

                            </p>

                        `;


                card.innerHTML = `

                    <h3>

                        ${escapeHtml(
                            dataset.filename
                        )}

                    </h3>


                    <span class="dataset-type ${escapeHtml(
                        dataset.dataset_type ||
                        "original"
                    )}">

                        ${escapeHtml(
                            (
                                dataset.dataset_type ||
                                "original"
                            ).toUpperCase()
                        )}

                    </span>


                    <p class="dataset-meta">

                        <strong>
                            Dataset ID:
                        </strong>

                        ${escapeHtml(
                            dataset.dataset_id
                        )}

                    </p>


                    ${parentInfo}


                    ${
                        isActive
                            ? `

                                <button
                                    class="primary-btn switch-dataset-btn"
                                    disabled
                                >

                                    Currently Active

                                </button>

                            `
                            : `

                                <button
                                    class="primary-btn switch-dataset-btn"
                                    data-dataset-id="${escapeHtml(
                                        dataset.dataset_id
                                    )}"
                                >

                                    Use This Dataset

                                </button>

                            `
                    }

                `;


                container.appendChild(
                    card
                );

            }
        );


        document
            .querySelectorAll(
                ".switch-dataset-btn"
            )
            .forEach(
                button => {

                    if (
                        button.disabled
                    ) {
                        return;
                    }


                    button.addEventListener(
                        "click",
                        () => {

                            switchDataset(
                                button.dataset.datasetId
                            );

                        }
                    );

                }
            );

    } catch (error) {

        console.error(
            "Dataset loading error:",
            error
        );


        container.innerHTML = `

            <div class="empty-state">

                Failed to load datasets.

                <br>

                ${escapeHtml(
                    error.message
                )}

            </div>

        `;

    }

}


/* =====================================================
   SWITCH DATASET
===================================================== */

async function switchDataset(
    selectedDatasetId
) {

    try {

        const response =
            await fetch(
                `${API_URL}/datasets/active/${selectedDatasetId}`,
                {
                    method:
                        "PUT"
                }
            );


        const data =
            await getResponseData(
                response
            );


        if (!response.ok) {

            throw new Error(
                data.detail ||
                "Failed to switch dataset."
            );

        }


        datasetId =
            selectedDatasetId;


        cleanedDatasetId =
            null;


        aiConversationHistory =
            [];


        const filename =
            data.active_dataset?.filename ||
            "Selected Dataset";


        updateActiveDatasetUI(
            filename
        );


        updateAIDatasetStatus(
            filename
        );


        await loadDatasets();


        alert(
            "Active dataset changed successfully!"
        );

    } catch (error) {

        console.error(
            "Dataset Switch Error:",
            error
        );


        alert(
            "Dataset Switch Error: " +
            error.message
        );

    }

}


const refreshDatasetsButton =
    document.getElementById(
        "refresh-datasets-btn"
    );


if (refreshDatasetsButton) {

    refreshDatasetsButton.addEventListener(
        "click",
        loadDatasets
    );

}


/* =====================================================
   AI DATASET STATUS
===================================================== */

function updateAIDatasetStatus(
    filename
) {

    if (!aiDatasetStatus) {
        return;
    }


    if (!datasetId) {

        aiDatasetStatus.textContent =
            "Select or upload a dataset to start analyzing.";

        return;

    }


    aiDatasetStatus.textContent =
        `Dataset connected: ${filename || "Active Dataset"}`;

}


/* =====================================================
   ADD AI MESSAGE
===================================================== */

function addAIMessage(
    text,
    role = "assistant"
) {

    if (!aiChatMessages) {
        return;
    }


    const message =
        document.createElement(
            "div"
        );


    message.className =
        `ai-message ${role}-message`;


    const avatar =
        document.createElement(
            "div"
        );


    avatar.className =
        "message-avatar";


    avatar.textContent =
        role === "user"
            ? "YOU"
            : "AI";


    const bubble =
        document.createElement(
            "div"
        );


    bubble.className =
        "message-bubble";


    bubble.textContent =
        text;


    message.appendChild(
        avatar
    );


    message.appendChild(
        bubble
    );


    aiChatMessages.appendChild(
        message
    );


    scrollAIChatToBottom();

}


/* =====================================================
   AI TYPING INDICATOR
===================================================== */

function showAITypingIndicator() {

    if (!aiChatMessages) {
        return;
    }


    removeAITypingIndicator();


    const message =
        document.createElement(
            "div"
        );


    message.className =
        "ai-message assistant-message";


    message.id =
        "ai-typing-message";


    const avatar =
        document.createElement(
            "div"
        );


    avatar.className =
        "message-avatar";


    avatar.textContent =
        "AI";


    const bubble =
        document.createElement(
            "div"
        );


    bubble.className =
        "message-bubble";


    bubble.innerHTML = `

        <div class="typing-indicator">

            <span class="typing-dot"></span>

            <span class="typing-dot"></span>

            <span class="typing-dot"></span>

        </div>

    `;


    message.appendChild(
        avatar
    );


    message.appendChild(
        bubble
    );


    aiChatMessages.appendChild(
        message
    );


    scrollAIChatToBottom();

}


function removeAITypingIndicator() {

    const typingMessage =
        document.getElementById(
            "ai-typing-message"
        );


    if (typingMessage) {

        typingMessage.remove();

    }

}


function scrollAIChatToBottom() {

    if (!aiChatMessages) {
        return;
    }


    aiChatMessages.scrollTop =
        aiChatMessages.scrollHeight;

}


/* =====================================================
   SEND AI QUESTION
===================================================== */

async function sendAIQuestion(
    predefinedQuestion = null
) {

    if (
        aiIsSending
    ) {
        return;
    }


    if (!datasetId) {

        addAIMessage(
            "Please upload or select a dataset before asking me questions.",
            "assistant"
        );

        return;

    }


    if (
        !aiQuestionInput &&
        !predefinedQuestion
    ) {
        return;
    }


    const question =
        predefinedQuestion
            ? predefinedQuestion.trim()
            : aiQuestionInput.value.trim();


    if (!question) {
        return;
    }


    if (
        question.length > 5000
    ) {

        addAIMessage(
            "Please keep your question under 5000 characters.",
            "assistant"
        );

        return;

    }


    addAIMessage(
        question,
        "user"
    );


    aiConversationHistory.push({

        role:
            "user",

        content:
            question

    });


    if (
        !predefinedQuestion &&
        aiQuestionInput
    ) {

        aiQuestionInput.value =
            "";


        autoResizeAIInput();

    }


    aiIsSending =
        true;


    if (aiSendButton) {

        aiSendButton.disabled =
            true;

    }


    if (aiQuestionInput) {

        aiQuestionInput.disabled =
            true;

    }


    showAITypingIndicator();


    try {

        const response =
            await fetch(
                `${API_URL}/ai/chat/${datasetId}`,
                {

                    method:
                        "POST",

                    headers: {

                        "Content-Type":
                            "application/json"

                    },

                    body:
                        JSON.stringify({

                            question:
                                question

                        })

                }
            );


        const data =
            await getResponseData(
                response
            );


        if (!response.ok) {

            throw new Error(
                data.detail ||
                data.message ||
                "AI analysis failed."
            );

        }


        const answer =
            data.answer ||
            data.response ||
            "I could not generate an answer for this question.";


        removeAITypingIndicator();


        addAIMessage(
            answer,
            "assistant"
        );


        aiConversationHistory.push({

            role:
                "assistant",

            content:
                answer

        });


        if (
            aiConversationHistory.length >
            20
        ) {

            aiConversationHistory =
                aiConversationHistory.slice(
                    -20
                );

        }

    } catch (error) {

        removeAITypingIndicator();


        console.error(
            "AI Assistant Error:",
            error
        );


        addAIMessage(
            `AI Error: ${error.message}`,
            "assistant"
        );

    } finally {

        aiIsSending =
            false;


        if (aiSendButton) {

            aiSendButton.disabled =
                false;

        }


        if (aiQuestionInput) {

            aiQuestionInput.disabled =
                false;


            aiQuestionInput.focus();

        }

    }

}


/* =====================================================
   AI SEND BUTTON
===================================================== */

if (aiSendButton) {

    aiSendButton.addEventListener(
        "click",
        () => {

            sendAIQuestion();

        }
    );

}


/* =====================================================
   ENTER TO SEND
===================================================== */

if (aiQuestionInput) {

    aiQuestionInput.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Enter" &&
                !event.shiftKey
            ) {

                event.preventDefault();


                sendAIQuestion();

            }

        }
    );

}


/* =====================================================
   AUTO RESIZE AI INPUT
===================================================== */

if (aiQuestionInput) {

    aiQuestionInput.addEventListener(
        "input",
        autoResizeAIInput
    );

}


function autoResizeAIInput() {

    if (!aiQuestionInput) {
        return;
    }


    aiQuestionInput.style.height =
        "auto";


    aiQuestionInput.style.height =
        Math.min(
            aiQuestionInput.scrollHeight,
            150
        ) + "px";

}


/* =====================================================
   AI QUICK QUESTIONS
===================================================== */

document
    .querySelectorAll(
        ".ai-suggestion-btn"
    )
    .forEach(
        button => {

            button.addEventListener(
                "click",
                () => {

                    const question =
                        button.dataset.question ||
                        button.textContent.trim();


                    sendAIQuestion(
                        question
                    );

                }
            );

        }
    );


/* =====================================================
   THEME SYSTEM
===================================================== */

const themeToggle =
    document.getElementById(
        "theme-toggle"
    );


const themeIcon =
    document.getElementById(
        "theme-icon"
    );


function setTheme(theme) {

    if (
        theme === "dark"
    ) {

        document.body.classList.add(
            "dark-theme"
        );


        if (themeIcon) {

            themeIcon.textContent =
                "☀";

        }

    } else {

        document.body.classList.remove(
            "dark-theme"
        );


        if (themeIcon) {

            themeIcon.textContent =
                "☾";

        }

    }


    localStorage.setItem(
        "datapilot-theme",
        theme
    );

}


const savedTheme =
    localStorage.getItem(
        "datapilot-theme"
    );


if (savedTheme) {

    setTheme(
        savedTheme
    );

} else {

    const prefersDark =
        window.matchMedia(
            "(prefers-color-scheme: dark)"
        ).matches;


    setTheme(
        prefersDark
            ? "dark"
            : "light"
    );

}


if (themeToggle) {

    themeToggle.addEventListener(
        "click",
        () => {

            const isDark =
                document.body.classList.contains(
                    "dark-theme"
                );


            setTheme(
                isDark
                    ? "light"
                    : "dark"
            );

        }
    );

}


/* =====================================================
   UTILITY - ESCAPE HTML
===================================================== */

function escapeHtml(value) {

    const div =
        document.createElement(
            "div"
        );


    div.textContent =
        value ?? "";


    return div.innerHTML;

}


/* =====================================================
   INITIAL LOAD
===================================================== */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        loadDatasets();

        updateAIDatasetStatus(
            null
        );

    }
);
