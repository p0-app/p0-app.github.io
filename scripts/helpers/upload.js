function initUpload(areaId, buttonId, inputId, fileType, callback) {
    let fileInput = document.getElementById(inputId);
    document.getElementById(buttonId).addEventListener("click", () => {
        fileInput.click();
    });
    fileInput.addEventListener("change", event => {
        event.preventDefault();
        handleUpload(event.target.files, fileType, callback);
    });

    if (areaId) {
        let uploadArea = document.getElementById(areaId);
        uploadArea.addEventListener("dragover", event => {
            event.preventDefault();
            uploadArea.classList.add("dragover");
        });
        uploadArea.addEventListener("dragleave", () => {
            uploadArea.classList.remove("dragover");
        });
        uploadArea.addEventListener("drop", event => {
            event.preventDefault();
            uploadArea.classList.remove("dragover");
            handleUpload(event.dataTransfer.files, fileType, callback);
        });
    }
}

function handleUpload(data, fileType, callback) {
    let files = Array.from(data).filter(x => x.type.startsWith(fileType));
    callback(files);
}